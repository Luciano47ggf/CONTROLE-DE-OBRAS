"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { makeVariants } from "@/lib/images";
import { dbError } from "@/lib/form";
import { PHOTO_MAX_PER_UPLOAD } from "@/lib/photo-rules";
import type { ActionState } from "@/lib/types";

const BUCKET = "acervo";

export type Supa = Awaited<ReturnType<typeof createClient>>;

/** Baixa o original já enviado pelo navegador e grava as versões de exibição e miniatura */
export async function processOriginal(supabase: Supa, originalPath: string) {
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(originalPath);
  if (error || !blob) throw new Error("O arquivo enviado não foi encontrado no armazenamento.");
  const variants = await makeVariants(Buffer.from(await blob.arrayBuffer()));

  const base = originalPath.replace(/\/original\.[a-z]+$/, "");
  const displayPath = `${base}/exibicao.webp`;
  const thumbPath = `${base}/miniatura.webp`;
  for (const [path, body] of [[displayPath, variants.display], [thumbPath, variants.thumb]] as const) {
    const up = await supabase.storage.from(BUCKET).upload(path, body, { contentType: "image/webp", upsert: true });
    if (up.error) throw new Error("Não foi possível gravar as versões da foto.");
  }
  return { displayPath, thumbPath, width: variants.width, height: variants.height };
}

const registerSchema = z.object({
  artworkId: z.uuid(),
  paths: z.array(z.string()).min(1).max(PHOTO_MAX_PER_UPLOAD),
});

/**
 * Registra fotos que o navegador já enviou ao Storage em
 * obras/{artworkId}/{uuid}/original.{ext}. Retorna erro por arquivo, sem abortar os demais.
 */
export async function registerArtworkPhotos(artworkId: string, paths: string[]): Promise<ActionState & { saved?: number }> {
  const parsed = registerSchema.safeParse({ artworkId, paths });
  if (!parsed.success) return { error: "Envio inválido." };
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };

  const pattern = new RegExp(`^obras/${artworkId}/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
  const supabase = await createClient();
  const problems: string[] = [];
  let saved = 0;

  for (const path of parsed.data.paths) {
    if (!pattern.test(path)) {
      problems.push("Caminho de arquivo inesperado.");
      continue;
    }
    try {
      const v = await processOriginal(supabase, path);
      const { error } = await supabase.from("artwork_photos").insert({
        artwork_id: artworkId,
        original_path: path,
        display_path: v.displayPath,
        thumb_path: v.thumbPath,
        width: v.width,
        height: v.height,
      });
      if (error) throw new Error(dbError(error).error);
      saved++;
    } catch (e) {
      problems.push((e as Error).message);
      const base = path.replace(/\/original\.[a-z]+$/, "");
      await supabase.storage.from(BUCKET).remove([path, `${base}/exibicao.webp`, `${base}/miniatura.webp`]);
    }
  }

  revalidatePath(`/obras/${artworkId}`);
  revalidatePath("/obras");
  return problems.length
    ? { saved, error: `${saved} foto(s) salva(s). Problemas: ${[...new Set(problems)].join(" ")}` }
    : { ok: true, saved };
}

async function photoArtwork(supabase: Supa, photoId: string) {
  const { data } = await supabase.from("artwork_photos").select("artwork_id").eq("id", photoId).single();
  return data?.artwork_id ?? null;
}

export async function deleteArtworkPhoto(photoId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("artwork_photos")
    .select("artwork_id, original_path, display_path, thumb_path")
    .eq("id", photoId)
    .single();
  if (!photo) return { error: "Foto não encontrada." };

  const { error } = await supabase.from("artwork_photos").delete().eq("id", photoId);
  if (error) return dbError(error);
  // Registro some primeiro; arquivos depois (um arquivo órfão não quebra nada; o contrário sim)
  await supabase.storage.from(BUCKET).remove([...new Set([photo.original_path, photo.display_path, photo.thumb_path])]);
  revalidatePath(`/obras/${photo.artwork_id}`);
  revalidatePath("/obras");
  return { ok: true };
}

export async function setArtworkCover(photoId: string): Promise<ActionState> {
  const supabase = await createClient();
  const artworkId = await photoArtwork(supabase, photoId);
  const { error } = await supabase.rpc("set_cover_photo", { p_photo_id: photoId });
  if (error) return dbError(error);
  revalidatePath(`/obras/${artworkId}`);
  revalidatePath("/obras");
  return { ok: true };
}

export async function reorderArtworkPhotos(artworkId: string, ids: string[]): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_artwork_photos", { p_artwork_id: artworkId, p_ids: ids });
  if (error) return dbError(error);
  revalidatePath(`/obras/${artworkId}`);
  return { ok: true };
}

export async function updatePhotoCaption(photoId: string, caption: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artwork_photos")
    .update({ caption: caption.trim() || null })
    .eq("id", photoId)
    .select("artwork_id")
    .single();
  if (error) return dbError(error);
  revalidatePath(`/obras/${data.artwork_id}`);
  return { ok: true };
}

/** Foto do espaço: uma só, enviada em espacos/{clientId}/{spaceId}/{uuid}/original.{ext} */
export async function setSpacePhoto(spaceId: string, path: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: space } = await supabase.from("client_spaces").select("client_id, photo_path").eq("id", spaceId).single();
  if (!space) return { error: "Espaço não encontrado." };
  const pattern = new RegExp(`^espacos/${space.client_id}/${spaceId}/[0-9a-f-]{36}/original\\.(jpg|png|webp)$`);
  if (!pattern.test(path)) return { error: "Caminho de arquivo inesperado." };

  let v: Awaited<ReturnType<typeof processOriginal>> | undefined;
  try {
    v = await processOriginal(supabase, path);
    const { error } = await supabase.from("client_spaces").update({ photo_path: v.displayPath }).eq("id", spaceId);
    if (error) throw new Error(dbError(error).error);
    // o original e a miniatura do espaço não são usados: apaga para não ocupar espaço
    await supabase.storage.from(BUCKET).remove([path, v.thumbPath]);
    if (space.photo_path && space.photo_path !== v.displayPath) {
      await supabase.storage.from(BUCKET).remove([space.photo_path]);
    }
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([path, v?.displayPath, v?.thumbPath].filter((p): p is string => !!p));
    return { error: (e as Error).message };
  }
  revalidatePath(`/espacos/${spaceId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Remove a foto do espaço, sem exigir um novo upload */
export async function removeSpacePhoto(spaceId: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode alterar fotos." };
  const supabase = await createClient();
  const { data: space } = await supabase.from("client_spaces").select("photo_path").eq("id", spaceId).single();
  if (!space?.photo_path) return { ok: true };
  const { error } = await supabase.from("client_spaces").update({ photo_path: null }).eq("id", spaceId);
  if (error) return dbError(error);
  await supabase.storage.from(BUCKET).remove([space.photo_path]);
  revalidatePath(`/espacos/${spaceId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}
