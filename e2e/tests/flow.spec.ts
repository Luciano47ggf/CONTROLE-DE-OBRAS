import { test, expect } from "@playwright/test";
import { createArtist, createArtwork, createClient, createEnvironment, createSpace, uid } from "./helpers";

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
  await createEnvironment(page, clientId, "Recepção");
  // Parede 4 × 2,5 com margem padrão de 0,20 m → área útil 3,6 × 2,1
  await createSpace(page, clientId, "Recepção", "Parede A", "4", "2,5");
  const fitsId = await createArtwork(page, { code: `C-${id}`, title: fits, artist, w: "3,2", h: "2" });
  await createArtwork(page, { code: `G-${id}`, title: tooBig, artist, w: "3,8", h: "2,2" }); // cabe na parede, não na margem
  await createArtwork(page, { code: `S-${id}`, title: second, artist, w: "1,5", h: "1" });

  // Ponto vazio no painel do cliente
  await page.goto(`/clientes/${clientId}`);
  const spaceCard = (name: string) => page.locator("div.panel", { has: page.getByRole("link", { name, exact: true }) }).last();
  await expect(spaceCard("Parede A").getByText("Vazio, sem obra no momento.")).toBeVisible();

  // Abre o drawer de instalação a partir do ponto: só o que cabe aparece
  await spaceCard("Parede A").getByRole("button", { name: "Adicionar obra" }).click();
  const installDrawer = page.getByRole("dialog", { name: /Adicionar obra/ });
  await expect(installDrawer).toBeVisible();
  const candidate = (title: string) => installDrawer.locator("li", { has: installDrawer.getByRole("link", { name: title, exact: true }) });
  await expect(candidate(fits)).toHaveCount(1);
  await expect(candidate(tooBig)).toHaveCount(0);
  await expect(candidate(fits).getByText(/^\d{1,3}% compatível$/)).toBeVisible();
  await expect(candidate(fits).getByText("Inédita neste cliente")).toBeVisible();

  // Instala
  await candidate(fits).getByText("Instalar esta obra").click();
  await candidate(fits).getByLabel("Responsável").fill("Equipe E2E");
  await candidate(fits).getByRole("button", { name: "Instalar agora" }).click();
  await expect(page.getByRole("status")).toContainText("Obra instalada");
  const spaceId = page.url().split("/").pop()!.split("?")[0]!;
  await expect(page.getByRole("link", { name: fits }).first()).toBeVisible();
  await expect(page.getByText("Faltam 90 dias")).toBeVisible();

  // Substituir pela segunda obra, direto do ponto no painel do cliente
  await page.goto(`/clientes/${clientId}`);
  await expect(spaceCard("Parede A").getByRole("link", { name: fits, exact: true })).toBeVisible();
  await spaceCard("Parede A").getByRole("button", { name: `Mais opções de Parede A` }).click();
  await page.getByRole("menuitem", { name: "Substituir obra" }).click();
  const substituteDrawer = page.getByRole("dialog", { name: /Substituir obra/ });
  await expect(substituteDrawer).toBeVisible();
  const subCandidate = (title: string) => substituteDrawer.locator("li", { has: substituteDrawer.getByRole("link", { name: title, exact: true }) });
  await subCandidate(second).getByText("Substituir por esta obra").click();
  await expect(subCandidate(second).getByText(`“${fits}” será retirada`)).toBeVisible();
  await subCandidate(second).getByRole("button", { name: "Substituir e instalar" }).click();
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

  // Histórico do cliente (aba) mostra as duas obras
  await page.goto(`/clientes/${clientId}`);
  await page.getByRole("button", { name: "Histórico" }).click();
  await expect(page.getByRole("link", { name: fits }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: second }).first()).toBeVisible();

  // Nova sugestão para o mesmo ponto: a primeira volta, mas perde o bônus de inédita
  await page.getByRole("button", { name: "Ambientes e pontos" }).click();
  await spaceCard("Parede A").getByRole("button", { name: `Mais opções de Parede A` }).click();
  await page.getByRole("menuitem", { name: "Substituir obra" }).click();
  await expect(page.getByRole("dialog", { name: /Substituir obra/ }).getByText(/Passou por este cliente 1 vez/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Retirar a segunda para manutenção, na página do ponto
  await page.goto(`/espacos/${spaceId}`);
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
