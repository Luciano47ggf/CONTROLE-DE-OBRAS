/** Regras de upload compartilhadas entre navegador e servidor */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PHOTO_MAX_BYTES = 30 * 1024 * 1024;
export const PHOTO_MAX_PER_UPLOAD = 12;

export function photoProblem(file: { type: string; size: number; name: string }): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: use JPG, PNG ou WebP. No iPhone, a câmera em "Mais compatível" gera JPG.`;
  }
  if (file.size > PHOTO_MAX_BYTES) return `${file.name}: o limite é 30 MB.`;
  return null;
}

export function extFor(type: string) {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}
