// Gera as chaves anon e service_role (JWT HS256) para a pilha local de testes.
import { createHmac } from "node:crypto";

export const JWT_SECRET = process.env.E2E_JWT_SECRET ?? "e2e-local-jwt-secret-com-pelo-menos-32-caracteres";

const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

export function sign(payload, secret = JWT_SECRET) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ iss: "acervo-e2e", iat: 1700000000, exp: 4900000000, ...payload });
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

export const ANON_KEY = sign({ role: "anon" });
export const SERVICE_KEY = sign({ role: "service_role" });

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`ANON_KEY=${ANON_KEY}\nSERVICE_KEY=${SERVICE_KEY}`);
}
