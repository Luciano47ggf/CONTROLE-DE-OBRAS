"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { processOriginal } from "@/app/(app)/obras/photo-actions";
import { dbError, formObject, optInt, optText, requiredText, zodErrors } from "@/lib/form";
import type { ActionState } from "@/lib/types";

const BUCKET = "acervo";

const envSchema = z.object({
  client_id: z.uuid(),
  name: requiredText("Nome"),
  description: optText,
  position: optInt(0, 10_000),
  draft_id: z.uuid().optional(),
  photo_path: optText,
});

export async function saveEnvironment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = envSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const id = fd.get("id") as string | null;
  const { draft_id, photo_path, ...fields } = parsed.data;
  const supabase = await createClient();

  const values = { ...fields, position: fields.position ?? 0, active: fd.get("active") !== "off" };

  if (id) {
    const { error } = await supabase.from("client_environments").update(values).eq("id", id);
    if (error) return dbError(error);
  } else {
    // Cadastro novo: se uma foto já foi enviada ao Storage (ambientes/{clientId}/{draft_id}/...),
    // o ambiente nasce com esse mesmo id para que o caminho já enviado bata com o registro.
    const { error } = await supabase
      .from("client_environments")
      .insert({ ...values, ...(draft_id ? { id: draft_id } : {}) });
    if (error) return dbError(error);

    if (draft_id && photo_path) {
      const pattern = new RegExp(`^ambientes/${fields.client_id}/${draft_id}/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
      if (pattern.test(photo_path)) {
        try {
          const v = await processOriginal(supabase, photo_path);
          await supabase.from("client_environments").update({ photo_path: v.displayPath }).eq("id", draft_id);
          await supabase.storage.from(BUCKET).remove([photo_path, v.thumbPath]);
        } catch {
          await supabase.storage.from(BUCKET).remove([photo_path]);
        }
      }
    }
  }
  revalidatePath(`/clientes/${parsed.data.client_id}`);
  redirect(`/clientes/${parsed.data.client_id}`);
}

/** Foto do ambiente: uma só, enviada em ambientes/{clientId}/{environmentId}/{uuid}/original.{ext} */
export async function setEnvironmentPhoto(environmentId: string, path: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: env } = await supabase
    .from("client_environments")
    .select("client_id, photo_path")
    .eq("id", environmentId)
    .single();
  if (!env) return { error: "Ambiente não encontrado." };
  const pattern = new RegExp(`^ambientes/${env.client_id}/${environmentId}/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
  if (!pattern.test(path)) return { error: "Caminho de arquivo inesperado." };

  let v: Awaited<ReturnType<typeof processOriginal>> | undefined;
  try {
    v = await processOriginal(supabase, path);
    const { error } = await supabase.from("client_environments").update({ photo_path: v.displayPath }).eq("id", environmentId);
    if (error) throw new Error(dbError(error).error);
    // o original e a miniatura do ambiente não são usados: apaga para não ocupar espaço
    await supabase.storage.from(BUCKET).remove([path, v.thumbPath]);
    if (env.photo_path && env.photo_path !== v.displayPath) {
      await supabase.storage.from(BUCKET).remove([env.photo_path]);
    }
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([path, v?.displayPath, v?.thumbPath].filter((p): p is string => !!p));
    return { error: (e as Error).message };
  }
  revalidatePath(`/clientes/${env.client_id}`);
  return { ok: true };
}

/** Remove a foto do ambiente, sem exigir um novo upload */
export async function removeEnvironmentPhoto(environmentId: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: env } = await supabase.from("client_environments").select("client_id, photo_path").eq("id", environmentId).single();
  if (!env) return { error: "Ambiente não encontrado." };
  if (!env.photo_path) return { ok: true };
  const { error } = await supabase.from("client_environments").update({ photo_path: null }).eq("id", environmentId);
  if (error) return dbError(error);
  await supabase.storage.from(BUCKET).remove([env.photo_path]);
  revalidatePath(`/clientes/${env.client_id}`);
  return { ok: true };
}
