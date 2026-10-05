import { test, expect } from "@playwright/test";
import { login, uid } from "./helpers";

test("administrador cria usuário de consulta, que não altera nada, e depois o desativa", async ({ browser }) => {
  const id = uid();
  const email = `consulta-${id}@teste.com`;
  const password = `Consulta-${id}-senha`;

  const admin = await browser.newPage({ storageState: "e2e/.auth/admin.json" });
  await admin.goto("/usuarios");
  const form = admin.locator("section", { has: admin.getByRole("heading", { name: "Novo usuário" }) });
  await form.getByLabel("Nome").fill(`Consulta ${id}`);
  await form.getByLabel("E-mail").fill(email);
  await form.getByLabel("Papel").selectOption("leitura");
  await form.getByLabel("Senha temporária").fill(password);
  await form.getByRole("button", { name: "Criar usuário" }).click();
  await expect(form.getByText("Usuário criado.")).toBeVisible();
  await expect(admin.getByText(email)).toBeVisible();

  // O usuário de consulta entra e não vê ações de escrita
  const ctx = await browser.newContext();
  const user = await ctx.newPage();
  await login(user, email, password);
  await expect(user.getByText("Seu acesso é só de consulta.")).toBeVisible();
  await user.goto("/obras");
  await expect(user.getByRole("heading", { level: 1, name: "Acervo e estoque" })).toBeVisible();
  await expect(user.getByRole("link", { name: "Cadastrar obra" })).toHaveCount(0);
  await expect(user.getByRole("link", { name: "Usuários" })).toHaveCount(0);
  const r = await user.goto("/usuarios");
  expect(r?.status()).toBe(404);

  // Admin desativa: a sessão aberta perde o acesso na próxima navegação
  await admin.reload();
  const row = admin.locator("li", { hasText: email });
  await row.locator("summary").click();
  admin.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Desativar acesso" }).click();
  await expect(row.getByText("Inativo")).toBeVisible();

  await user.goto("/obras");
  await expect(user).toHaveURL(/\/login\?inativo=1/);
  await expect(user.getByRole("alert").filter({ hasText: "Sua conta foi desativada" })).toBeVisible();

  // E o login fica bloqueado no Auth
  await login(user, email, password);
  await expect(user.getByRole("alert").filter({ hasText: "desativada" })).toBeVisible();

  // O próprio admin não consegue se desativar (botão não aparece na própria linha)
  const me = admin.locator("li", { hasText: "(você)" });
  await me.locator("summary").click();
  await expect(me.getByRole("button", { name: "Desativar acesso" })).toHaveCount(0);

  await ctx.close();
  await admin.close();
});

test("troca da própria senha exige a senha atual", async ({ browser }) => {
  const id = uid();
  const email = `troca-${id}@teste.com`;
  const admin = await browser.newPage({ storageState: "e2e/.auth/admin.json" });
  await admin.goto("/usuarios");
  const form = admin.locator("section", { has: admin.getByRole("heading", { name: "Novo usuário" }) });
  await form.getByLabel("Nome").fill(`Troca ${id}`);
  await form.getByLabel("E-mail").fill(email);
  await form.getByLabel("Senha temporária").fill("Temporaria-123");
  await form.getByRole("button", { name: "Criar usuário" }).click();
  await expect(form.getByText("Usuário criado.")).toBeVisible();

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, email, "Temporaria-123");
  await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(`Troca ${id}`) }).click(); // link "Minha conta" no rodapé do menu
  await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
  await page.getByLabel("Senha atual").fill("errada-errada");
  await page.getByLabel("Nova senha", { exact: true }).fill("Definitiva-456");
  await page.getByLabel("Repita a nova senha").fill("Definitiva-456");
  await page.getByRole("button", { name: "Trocar senha" }).click();
  await expect(page.getByText("Senha atual incorreta.")).toBeVisible();

  await page.getByLabel("Senha atual").fill("Temporaria-123");
  await page.getByLabel("Nova senha", { exact: true }).fill("Definitiva-456");
  await page.getByLabel("Repita a nova senha").fill("Definitiva-456");
  await page.getByRole("button", { name: "Trocar senha" }).click();
  await expect(page.getByText("Senha alterada.")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await login(page, email, "Definitiva-456");
  await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();
  await ctx.close();
  await admin.close();
});
