import { expect, type Page } from "@playwright/test";

/** Sufixo único para os dados de cada teste (o banco é compartilhado) */
export const uid = () => Math.random().toString(36).slice(2, 8);

export async function createArtist(page: Page, name: string) {
  await page.goto("/artistas");
  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Cadastrar artista" }).click();
  await expect(page.getByText("Artista cadastrado.")).toBeVisible();
}

export async function createClient(page: Page, name: string) {
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByLabel("Cidade").fill("Cuiabá");
  await page.getByLabel("UF").fill("MT");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return page.url().split("/").pop()!;
}

export async function createSpace(page: Page, clientId: string, name: string, w: string, h: string) {
  await page.goto(`/clientes/${clientId}/espacos/novo`);
  await page.getByLabel("Nome do espaço").fill(name);
  await page.getByLabel("Largura disponível (m)").fill(w);
  await page.getByLabel("Altura disponível (m)").fill(h);
  await page.getByRole("button", { name: "Cadastrar espaço" }).click();
  await expect(page).toHaveURL(new RegExp(`/clientes/${clientId}$`));
}

export async function createArtwork(page: Page, a: { code: string; title: string; artist: string; w: string; h: string }) {
  await page.goto("/obras/nova");
  await page.getByLabel("Código interno").fill(a.code);
  await page.getByLabel("Nome da obra").fill(a.title);
  await page.getByLabel("Artista").selectOption({ label: a.artist });
  await page.getByLabel("Largura (m)").fill(a.w);
  await page.getByLabel("Altura (m)").fill(a.h);
  await page.getByRole("button", { name: "Cadastrar obra" }).click();
  await expect(page.getByRole("heading", { level: 1, name: a.title })).toBeVisible();
  return page.url().split("/").pop()!;
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}
