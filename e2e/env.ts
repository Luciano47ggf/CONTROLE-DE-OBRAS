import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Lê e2e/.env.e2e (escrito por e2e/stack/up.sh) */
export function e2eEnv(): Record<string, string> {
  const file = join(__dirname, ".env.e2e");
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]!] = m[2]!;
  }
  return out;
}

export const ADMIN = { email: "e2e-admin@teste.com", password: "Senha-E2E-admin-1", name: "Admin E2E" };
