import { test, expect } from "@playwright/test";
import { createArtist, createArtwork, createClient, createSpace, uid } from "./helpers";

test.use({ storageState: "e2e/.auth/admin.json" });

test("do cadastro à instalação, troca e retirada, com histórico automático", async ({ page }) => {
  test.setTimeout(150_000); // jornada completa: ~15 páginas e 5 cadastros
  const id = uid();
  const artist = `Artista ${id}`;
  const client = `Hotel ${id}`;
  const fits = `Horizonte ${id}`;
  const tooBig = `Mural ${id}`;
  const second = `Geometria ${id}`;

  await createArtist(page, artist);
  const clientId = await createClient(page, client);
  // Parede 4 × 2,5 com margem padrão de 0,20 m → área útil 3,6 × 2,1
  await createSpace(page, clientId, "Recepção", "4", "2,5");
  const fitsId = await createArtwork(page, { code: `C-${id}`, title: fits, artist, w: "3,2", h: "2" });
  await createArtwork(page, { code: `G-${id}`, title: tooBig, artist, w: "3,8", h: "2,2" }); // cabe na parede, não na margem
  await createArtwork(page, { code: `S-${id}`, title: second, artist, w: "1,5", h: "1" });

  // Cartão do cliente: espaço vazio com obras compatíveis
  await page.goto(`/clientes/${clientId}`);
  const card = page.locator("article", { hasText: "Recepção" });
  await expect(card.getByText("Parede vazia")).toBeVisible();
  await card.getByRole("link", { name: "Ver sugestões" }).click();

  // Sugestões: só o que cabe com margem, com nota
  // cada sugestão é identificada pelo link com o título (textos ocultos dos formulários não contam)
  const suggestions = page.locator("ol > li");
  const item = (title: string) => suggestions.filter({ has: page.getByRole("link", { name: title, exact: true }) });
  await expect(item(fits)).toHaveCount(1);
  await expect(item(tooBig)).toHaveCount(0);
  const fitsItem = item(fits);
  await expect(fitsItem.getByText(/^\d{2,3}%$/)).toBeVisible();
  await expect(fitsItem.getByText("Inédita neste cliente")).toBeVisible();

  // Instalar
  await fitsItem.getByText("Instalar esta obra").click();
  await fitsItem.getByLabel("Responsável").fill("Equipe E2E");
  await fitsItem.getByRole("button", { name: "Instalar agora" }).click();
  await expect(page.getByRole("status")).toContainText("Obra instalada");
  await expect(page.getByRole("link", { name: fits }).first()).toBeVisible();
  await expect(page.getByText("Faltam 90 dias")).toBeVisible();

  // A obra instalada sai das sugestões; trocar pela segunda substitui e devolve a primeira
  await expect(item(fits)).toHaveCount(0);
  const secondItem = item(second);
  await secondItem.getByText("Trocar por esta obra").click();
  await expect(secondItem.getByText(`“${fits}” será retirada`)).toBeVisible();
  await secondItem.getByRole("button", { name: "Substituir e instalar" }).click();
  await expect(page.getByRole("status")).toContainText("Obra instalada");

  // Histórico do espaço registra a primeira obra, sem cadastro manual
  const spaceHistory = page.locator("section", { has: page.getByRole("heading", { name: "Obras que já estiveram neste espaço" }) });
  await expect(spaceHistory.getByRole("link", { name: fits })).toBeVisible();

  // Página da primeira obra: de volta ao estoque, com passagem e movimentações
  await page.goto(`/obras/${fitsId}`);
  await expect(page.getByText("Disponível", { exact: true })).toBeVisible();
  const passed = page.locator("section", { has: page.getByRole("heading", { name: "Por onde passou" }) });
  await expect(passed.getByRole("link", { name: client })).toBeVisible();
  await page.getByText(/Todas as movimentações/).click();
  await expect(page.getByText("Instalada para disponível")).toBeVisible();
  await expect(page.getByText(new RegExp(`Substituída por S-${id}`))).toBeVisible();

  // Histórico do cliente mostra as duas
  await page.goto(`/clientes/${clientId}`);
  const clientHistory = page.locator("section", { has: page.getByRole("heading", { name: "Obras que já passaram por aqui" }) });
  await expect(clientHistory.getByRole("link", { name: fits })).toBeVisible();
  await expect(clientHistory.getByRole("link", { name: second })).toBeVisible();

  // Nova sugestão para o mesmo espaço: a primeira volta, mas perde o bônus de inédita
  await page.locator("article", { hasText: "Recepção" }).getByRole("link", { name: "Encontrar nova obra" }).click();
  await expect(item(fits).getByText(/Passou por este cliente 1 vez/)).toBeVisible();

  // Retirar a segunda para manutenção
  await page.getByText("Registrar retirada sem substituir").click();
  await page.getByLabel("A obra vai para").selectOption("em_manutencao");
  await page.getByRole("button", { name: "Registrar retirada" }).click();
  await expect(page.getByText("Parede vazia")).toBeVisible();

  // Estoque: aba de manutenção mostra a obra
  await page.goto("/obras?status=em_manutencao");
  await expect(page.getByRole("link", { name: second })).toBeVisible();
});

test("dashboard reflete o acervo e o semáforo de trocas", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Próximas trocas" })).toBeVisible();
  await expect(page.getByText("Obras no acervo")).toBeVisible();
  const total = Number(await page.getByRole("link", { name: /Obras no acervo/ }).locator("span").first().textContent());
  expect(total).toBeGreaterThan(0);
});
