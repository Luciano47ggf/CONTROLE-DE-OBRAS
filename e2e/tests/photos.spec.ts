import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { createArtist, createArtwork, uid } from "./helpers";

test.use({ storageState: "e2e/.auth/admin.json" });

/** JPEG "de celular": 3000×2000, gravado deitado (orientação EXIF 6) e com GPS */
async function phoneJpeg(color: string) {
  return sharp({ create: { width: 3000, height: 2000, channels: 3, background: color } })
    .jpeg({ quality: 80 })
    .withMetadata({ orientation: 6 })
    .withExifMerge({
      IFD0: { Make: "CameraTeste" },
      IFD3: { GPSLatitudeRef: "S", GPSLatitude: "15/1 35/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "56/1 5/1 0/1" },
    })
    .toBuffer();
}

test("várias fotos: envio direto, versões geradas, capa, ordem e exclusão", async ({ page, request }) => {
  const id = uid();
  const artist = `Fotógrafo ${id}`;
  const title = `Obra com fotos ${id}`;
  await createArtist(page, artist);
  const artworkId = await createArtwork(page, { code: `F-${id}`, title, artist, w: "1", h: "1" });

  await expect(page.getByText("Nenhuma foto ainda")).toBeVisible();
  await page.getByRole("button", { name: "Adicionar fotos" }).click();

  // Arquivo inválido é recusado no navegador, antes de qualquer envio
  await page.getByTestId("photo-input").setInputFiles({ name: "notas.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") });
  await expect(page.getByRole("alert").filter({ hasText: "use JPG, PNG ou WebP" })).toBeVisible();

  const original = await phoneJpeg("#2f5d50");
  const origMeta = await sharp(original).metadata();
  expect(origMeta.orientation).toBe(6); // a foto de teste está mesmo "deitada"
  expect(origMeta.exif?.length).toBeGreaterThan(100); // e tem EXIF com GPS

  await page.getByTestId("photo-input").setInputFiles([
    { name: "frente.jpg", mimeType: "image/jpeg", buffer: original },
    { name: "detalhe.jpg", mimeType: "image/jpeg", buffer: await phoneJpeg("#a57f2c") },
  ]);
  await expect(page.getByTestId("photo-row")).toHaveCount(2, { timeout: 30_000 });

  // A foto principal carrega e é a versão de exibição em WebP
  const main = page.getByTestId("gallery-main");
  await expect(main).toBeVisible();
  const src = (await main.getAttribute("src"))!;
  expect(src).toMatch(/\/exibicao\.webp$/);

  const display = await request.get(src);
  expect(display.ok()).toBeTruthy();
  const meta = await sharp(await display.body()).metadata();
  expect(meta.format).toBe("webp");
  // Rotação aplicada: 3000×2000 deitada vira retrato, limitada a 2000 px
  expect(meta.width).toBe(1333);
  expect(meta.height).toBe(2000);
  // Metadados (inclusive GPS) não vão para a versão publicada
  expect(meta.exif).toBeUndefined();

  const thumb = await request.get(src.replace("exibicao.webp", "miniatura.webp"));
  expect((await sharp(await thumb.body()).metadata()).height).toBe(480);

  // Primeira é a capa; tornar a segunda capa reflete no estoque
  const rows = page.getByTestId("photo-row");
  await expect(rows.nth(0).getByText("Capa")).toBeVisible();
  await rows.nth(1).getByRole("button", { name: "Tornar capa" }).click();
  await expect(rows.nth(1).getByText("Capa")).toBeVisible();
  const secondThumb = await rows.nth(1).locator("img").getAttribute("src");

  await page.goto(`/obras?status=todas&q=F-${id}`);
  await expect(page.locator("tbody img")).toHaveAttribute("src", secondThumb!);

  // Legenda e reordenação persistem
  await page.goto(`/obras/${artworkId}`);
  await page.getByRole("button", { name: /Gerenciar fotos/ }).click();
  await rows.nth(0).getByLabel(/Legenda/).fill("Vista frontal");
  await rows.nth(0).getByLabel(/Legenda/).blur();
  await expect(rows.nth(0).getByText("Legenda salva")).toBeVisible();
  await rows.nth(1).getByRole("button", { name: "Mover para a esquerda" }).click();
  await expect(rows.nth(0).getByText("Capa")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Gerenciar fotos/ }).click();
  await expect(rows.nth(1).getByLabel(/Legenda/)).toHaveValue("Vista frontal");

  // Excluir a capa promove a outra
  page.once("dialog", (d) => d.accept());
  await rows.nth(0).getByRole("button", { name: "Excluir foto" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0).getByText("Capa")).toBeVisible();
  // Arquivos da foto excluída foram removidos do armazenamento
  expect((await request.get(secondThumb!)).status()).toBe(404);
});
