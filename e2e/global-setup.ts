import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ADMIN, e2eEnv } from "./env";

/** Garante o administrador dos testes e salva a sessão dele */
export default async function globalSetup(config: FullConfig) {
  const env = e2eEnv();
  const base = env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = { apikey: service, Authorization: `Bearer ${service}`, "content-type": "application/json" };

  const created = await fetch(`${base}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password, email_confirm: true, user_metadata: { full_name: ADMIN.name } }),
  });
  if (!created.ok && created.status !== 422) throw new Error(`criar admin: ${created.status} ${await created.text()}`);

  // Papel admin pela API REST com a chave de serviço (sem auth.uid(), o banco permite)
  const upd = await fetch(`${base}/rest/v1/profiles?email=eq.${encodeURIComponent(ADMIN.email)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ role: "admin", active: true }),
  });
  if (!upd.ok) throw new Error(`promover admin: ${upd.status} ${await upd.text()}`);

  const baseURL = config.projects[0]!.use.baseURL!;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("/");
  mkdirSync("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
  await browser.close();
}
