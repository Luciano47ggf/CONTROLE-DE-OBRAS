import "server-only";
import sharp from "sharp";

export const DISPLAY_MAX = 2000;
export const THUMB_MAX = 480;

/**
 * Gera as versões de exibição e miniatura em WebP.
 * - rotate() aplica a orientação EXIF (fotos de celular "deitadas")
 * - os metadados (EXIF, inclusive GPS) não são copiados para as versões geradas
 * - nunca amplia imagens pequenas
 */
export async function makeVariants(input: Buffer) {
  const base = sharp(input, { failOn: "error", limitInputPixels: 120_000_000 }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("Arquivo de imagem inválido.");

  const [display, thumb] = await Promise.all([
    base.clone().resize(DISPLAY_MAX, DISPLAY_MAX, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true }),
    base.clone().resize(THUMB_MAX, THUMB_MAX, { fit: "inside", withoutEnlargement: true }).webp({ quality: 76 }).toBuffer(),
  ]);
  return { display: display.data, thumb, width: display.info.width, height: display.info.height };
}
