// Executa um comando com as variáveis de e2e/.env.e2e (ex.: o build do Next)
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const env = { ...process.env };
for (const line of readFileSync(new URL("./.env.e2e", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}
const [cmd, ...args] = process.argv.slice(2);
const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
process.exit(r.status ?? 1);
