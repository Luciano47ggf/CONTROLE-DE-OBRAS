import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX = 10 * 1024 * 1024;

/** Envia uma foto ao bucket "acervo". Retorna o caminho, null se não houver arquivo, ou lança erro legível. */
export async function uploadPhoto(supabase: SupabaseClient, file: FormDataEntryValue | null, folder: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED.includes(file.type)) throw new Error("Envie a foto em JPG, PNG ou WebP.");
  if (file.size > MAX) throw new Error("A foto deve ter no máximo 10 MB.");
  const ext = file.type.split("/")[1]!.replace("jpeg", "jpg");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("acervo").upload(path, file, { contentType: file.type });
  if (error) throw new Error("Não foi possível enviar a foto. Tente novamente.");
  return path;
}

export async function removePhoto(supabase: SupabaseClient, path: string | null | undefined) {
  if (path) await supabase.storage.from("acervo").remove([path]);
}
