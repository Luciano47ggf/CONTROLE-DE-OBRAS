"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { processOriginal } from "@/app/(app)/obras/photo-actions";
import { dbError, formObject, optInt, optText, requiredText, zodErrors } from "@/lib/form";
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
});

export async function saveClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const id = fd.get("id") as string | null;
  const values = { ...parsed.data, active: fd.get("active") !== "off" };

  const supabase = await createClient();
  const res = id
    ? await supabase.from("clients").update(values).eq("id", id).select("id").single()
    : await supabase.from("clients").insert(values).select("id").single();
  if (res.error) return dbError(res.error);

  revalidatePath("/clientes");
  redirect(`/clientes/${res.data.id}`);
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

  try {
    const v = await processOriginal(supabase, path);
    const { error } = await supabase.from("clients").update({ logo_path: v.displayPath }).eq("id", clientId);
    if (error) throw new Error(dbError(error).error);
    await supabase.storage.from(BUCKET).remove([path, v.thumbPath]);
    if (client.logo_path && client.logo_path !== v.displayPath) {
      await supabase.storage.from(BUCKET).remove([client.logo_path]);
    }
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([path]);
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
