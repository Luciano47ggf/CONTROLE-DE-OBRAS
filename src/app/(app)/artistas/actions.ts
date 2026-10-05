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
  nationality: optText,
  birth_year: optInt(1000, 2100),
  bio: optText,
  notes: optText,
  draft_id: z.uuid().optional(),
  photo_path: optText,
});

export async function saveArtist(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const id = fd.get("id") as string | null;
  const { draft_id, photo_path, ...fields } = parsed.data;

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("artists").update(fields).eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/artistas");
    redirect("/artistas");
  }

  // Cadastro novo: se uma foto já foi enviada ao Storage (artistas/{draft_id}/...), o
  // artista nasce com esse mesmo id para que o caminho já enviado bata com o registro.
  const { error } = await supabase.from("artists").insert({ ...fields, ...(draft_id ? { id: draft_id } : {}) });
  if (error) return dbError(error);

  if (draft_id && photo_path) {
    const pattern = new RegExp(`^artistas/${draft_id}/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
    if (pattern.test(photo_path)) {
      try {
        const v = await processOriginal(supabase, photo_path);
        await supabase.from("artists").update({ photo_path: v.displayPath }).eq("id", draft_id);
        await supabase.storage.from(BUCKET).remove([photo_path, v.thumbPath]);
      } catch {
        await supabase.storage.from(BUCKET).remove([photo_path]);
      }
    }
  }

  revalidatePath("/artistas");
  return { ok: true };
}

/** Foto do artista: uma só, enviada em artistas/{artistId}/{uuid}/original.{ext} */
export async function setArtistPhoto(artistId: string, path: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: artist } = await supabase.from("artists").select("photo_path").eq("id", artistId).single();
  if (!artist) return { error: "Artista não encontrado." };
  const pattern = new RegExp(`^artistas/${artistId}/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
  if (!pattern.test(path)) return { error: "Caminho de arquivo inesperado." };

  let v: Awaited<ReturnType<typeof processOriginal>> | undefined;
  try {
    v = await processOriginal(supabase, path);
    const { error } = await supabase.from("artists").update({ photo_path: v.displayPath }).eq("id", artistId);
    if (error) throw new Error(dbError(error).error);
    await supabase.storage.from(BUCKET).remove([path, v.thumbPath]);
    if (artist.photo_path && artist.photo_path !== v.displayPath) {
      await supabase.storage.from(BUCKET).remove([artist.photo_path]);
    }
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([path, v?.displayPath, v?.thumbPath].filter((p): p is string => !!p));
    return { error: (e as Error).message };
  }
  revalidatePath(`/artistas/${artistId}`);
  revalidatePath("/artistas");
  return { ok: true };
}

/** Remove a foto do artista, sem exigir um novo upload */
export async function removeArtistPhoto(artistId: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: artist } = await supabase.from("artists").select("photo_path").eq("id", artistId).single();
  if (!artist?.photo_path) return { ok: true };
  const { error } = await supabase.from("artists").update({ photo_path: null }).eq("id", artistId);
  if (error) return dbError(error);
  await supabase.storage.from(BUCKET).remove([artist.photo_path]);
  revalidatePath(`/artistas/${artistId}`);
  revalidatePath("/artistas");
  return { ok: true };
}

export async function deleteArtist(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("artists").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return { error: "Este artista tem obras no acervo e não pode ser removido." };
    return dbError(error);
  }
  revalidatePath("/artistas");
  redirect("/artistas");
}
