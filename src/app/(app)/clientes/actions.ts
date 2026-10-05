"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { processOriginal } from "@/app/(app)/obras/photo-actions";
import { dbError, formObject, optCoordinate, optInt, optText, requiredText, zodErrors } from "@/lib/form";
import type { ActionState } from "@/lib/types";

const BUCKET = "acervo";

const schema = z.object({
  name: requiredText("Nome"),
  segment: optText,
  legal_name: optText,
  document: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const digits = v.replace(/\D/g, "");
      if (digits.length !== 11 && digits.length !== 14) {
        ctx.addIssue({ code: "custom", message: "CPF deve ter 11 dígitos e CNPJ 14." });
        return z.NEVER;
      }
      return digits;
    }),
  address: optText,
  city: optText,
  state: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!/^[A-Za-z]{2}$/.test(v)) {
        ctx.addIssue({ code: "custom", message: "Use a sigla, por exemplo MT." });
        return z.NEVER;
      }
      return v.toUpperCase();
    }),
  phone: optText,
  email: z.union([z.email("E-mail inválido."), z.undefined()]).transform((v) => v ?? null),
  contact_name: optText,
  notes: optText,
  default_swap_days: optInt(1, 3650),
  latitude: optCoordinate(-90, 90),
  longitude: optCoordinate(-180, 180),
  draft_id: z.uuid().optional(),
  logo_photo_path: optText,
  cover_photo_path: optText,
});

export async function saveClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const id = fd.get("id") as string | null;
  const { draft_id, logo_photo_path, cover_photo_path, ...rest } = parsed.data;
  const values = { ...rest, active: fd.get("active") !== "off" };

  const supabase = await createClient();
  if (id) {
    const res = await supabase.from("clients").update(values).eq("id", id).select("id").single();
    if (res.error) return dbError(res.error);
    revalidatePath("/clientes");
    redirect(`/clientes/${res.data.id}`);
  }

  // Cadastro novo: se logo e/ou capa já foram enviados ao Storage (clientes/{draft_id}/...),
  // o cliente nasce com esse mesmo id para que os caminhos já enviados batam com o registro.
  const res = await supabase
    .from("clients")
    .insert({ ...values, ...(draft_id ? { id: draft_id } : {}) })
    .select("id")
    .single();
  if (res.error) return dbError(res.error);
  const clientId = res.data.id;

  if (draft_id && logo_photo_path) {
    const pattern = new RegExp(`^clientes/${draft_id}/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
    if (pattern.test(logo_photo_path)) {
      try {
        const v = await processOriginal(supabase, logo_photo_path);
        await supabase.from("clients").update({ logo_path: v.displayPath }).eq("id", clientId);
        await supabase.storage.from(BUCKET).remove([logo_photo_path, v.thumbPath]);
      } catch {
        await supabase.storage.from(BUCKET).remove([logo_photo_path]);
      }
    }
  }
  if (draft_id && cover_photo_path) {
    const pattern = new RegExp(`^clientes/${draft_id}/capa/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
    if (pattern.test(cover_photo_path)) {
      try {
        const v = await processOriginal(supabase, cover_photo_path);
        await supabase.from("clients").update({ cover_path: v.displayPath }).eq("id", clientId);
        await supabase.storage.from(BUCKET).remove([cover_photo_path, v.thumbPath]);
      } catch {
        await supabase.storage.from(BUCKET).remove([cover_photo_path]);
      }
    }
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${clientId}`);
}

/** Logo do cliente: uma só, enviada em clientes/{clientId}/{uuid}/original.{ext} */
export async function setClientLogo(clientId: string, path: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("logo_path").eq("id", clientId).single();
  if (!client) return { error: "Cliente não encontrado." };
  const pattern = new RegExp(`^clientes/${clientId}/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
  if (!pattern.test(path)) return { error: "Caminho de arquivo inesperado." };

  let v: Awaited<ReturnType<typeof processOriginal>> | undefined;
  try {
    v = await processOriginal(supabase, path);
    const { error } = await supabase.from("clients").update({ logo_path: v.displayPath }).eq("id", clientId);
    if (error) throw new Error(dbError(error).error);
    await supabase.storage.from(BUCKET).remove([path, v.thumbPath]);
    if (client.logo_path && client.logo_path !== v.displayPath) {
      await supabase.storage.from(BUCKET).remove([client.logo_path]);
    }
  } catch (e) {
    // Se processOriginal já tinha gravado exibição/miniatura, elas também precisam sair
    // (senão ficam órfãs no Storage quando só a atualização no banco falha).
    await supabase.storage.from(BUCKET).remove([path, v?.displayPath, v?.thumbPath].filter((p): p is string => !!p));
    return { error: (e as Error).message };
  }
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
  return { ok: true };
}

/** Remove o logo do cliente, sem exigir um novo upload */
export async function removeClientLogo(clientId: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("logo_path").eq("id", clientId).single();
  if (!client?.logo_path) return { ok: true };
  const { error } = await supabase.from("clients").update({ logo_path: null }).eq("id", clientId);
  if (error) return dbError(error);
  await supabase.storage.from(BUCKET).remove([client.logo_path]);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
  return { ok: true };
}

/**
 * Foto de capa do cliente: a imagem de prévia do card (separada do logo), enviada em
 * clientes/{clientId}/capa/{uuid}/original.{ext}.
 */
export async function setClientCover(clientId: string, path: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("cover_path").eq("id", clientId).single();
  if (!client) return { error: "Cliente não encontrado." };
  const pattern = new RegExp(`^clientes/${clientId}/capa/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
  if (!pattern.test(path)) return { error: "Caminho de arquivo inesperado." };

  let v: Awaited<ReturnType<typeof processOriginal>> | undefined;
  try {
    v = await processOriginal(supabase, path);
    const { error } = await supabase.from("clients").update({ cover_path: v.displayPath }).eq("id", clientId);
    if (error) throw new Error(dbError(error).error);
    await supabase.storage.from(BUCKET).remove([path, v.thumbPath]);
    if (client.cover_path && client.cover_path !== v.displayPath) {
      await supabase.storage.from(BUCKET).remove([client.cover_path]);
    }
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([path, v?.displayPath, v?.thumbPath].filter((p): p is string => !!p));
    return { error: (e as Error).message };
  }
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
  return { ok: true };
}

/** Remove a foto de capa do cliente, sem exigir um novo upload */
export async function removeClientCover(clientId: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("cover_path").eq("id", clientId).single();
  if (!client?.cover_path) return { ok: true };
  const { error } = await supabase.from("clients").update({ cover_path: null }).eq("id", clientId);
  if (error) return dbError(error);
  await supabase.storage.from(BUCKET).remove([client.cover_path]);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
  return { ok: true };
}
