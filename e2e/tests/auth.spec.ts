import { test, expect } from "@playwright/test";
import { ADMIN } from "../env";
import { login } from "./helpers";

test.describe("acesso", () => {
  test("rota interna sem login leva ao login e volta para onde estava", async ({ page }) => {
    await page.goto("/trocas");
    await expect(page).toHaveURL(/\/login\?next=%2Ftrocas/);
    await page.getByLabel("E-mail").fill(ADMIN.email);
    await page.getByLabel("Senha").fill(ADMIN.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/trocas$/);
    await expect(page.getByRole("heading", { level: 1, name: "Trocas" })).toBeVisible();
  });

  test("senha errada mostra erro claro", async ({ page }) => {
    await login(page, ADMIN.email, "senha-errada");
    await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." })).toBeVisible();
  });

  test("sair encerra a sessão", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/obras");
    await expect(page).toHaveURL(/\/login/);
  });
});
