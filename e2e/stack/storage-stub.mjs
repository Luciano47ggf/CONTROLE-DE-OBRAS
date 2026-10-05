// Simulação mínima da API do Supabase Storage, só para os testes ponta a ponta.
// Guarda arquivos em disco. Exige JWT de usuário logado para escrever, mas NÃO
// aplica as políticas RLS do bucket (essas são cobertas pelos testes pgTAP).
import http from "node:http";
import { mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { createHmac } from "node:crypto";
import { JWT_SECRET } from "./jwt.mjs";

const ROOT = process.env.STORAGE_DIR ?? "/tmp/acervo-e2e-storage";
const PORT = Number(process.env.STORAGE_PORT ?? 5005);
const types = new Map(); // caminho → content-type

function claims(req) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  const [h, b, s] = token.split(".");
  if (!s) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(`${h}.${b}`).digest("base64url");
  if (expected !== s) return null;
  return JSON.parse(Buffer.from(b, "base64url").toString());
}

const safe = (p) => {
  const n = normalize(p).replace(/^(\.\.(\/|$))+/, "");
  if (n.includes("..")) throw new Error("caminho inválido");
  return join(ROOT, n);
};

const body = (req) => new Promise((ok, fail) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => ok(Buffer.concat(chunks)));
  req.on("error", fail);
});

const send = (res, code, obj) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    const path = decodeURIComponent(url.pathname);
    let m;

    // leitura pública: /object/public/{bucket}/{arquivo}
    if (req.method === "GET" && (m = path.match(/^\/object\/public\/([^/]+)\/(.+)$/))) {
      const file = safe(`${m[1]}/${m[2]}`);
      const data = await readFile(file).catch(() => null);
      if (!data) return send(res, 404, { statusCode: "404", error: "not_found", message: "Object not found" });
      res.writeHead(200, { "content-type": types.get(file) ?? "application/octet-stream", "cache-control": "no-store" });
      return res.end(data);
    }

    const who = claims(req);
    if (!who) return send(res, 401, { statusCode: "401", error: "Unauthorized", message: "Invalid JWT" });

    // download autenticado: GET /object/{bucket}/{arquivo}
    if (req.method === "GET" && (m = path.match(/^\/object\/(?:authenticated\/)?([^/]+)\/(.+)$/))) {
      const file = safe(`${m[1]}/${m[2]}`);
      const data = await readFile(file).catch(() => null);
      if (!data) return send(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
      res.writeHead(200, { "content-type": types.get(file) ?? "application/octet-stream" });
      return res.end(data);
    }

    const canWrite = who.role === "authenticated" || who.role === "service_role";

    // upload: POST/PUT /object/{bucket}/{arquivo}
    if ((req.method === "POST" || req.method === "PUT") && (m = path.match(/^\/object\/([^/]+)\/(.+)$/))) {
      if (!canWrite) return send(res, 403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
      const file = safe(`${m[1]}/${m[2]}`);
      const exists = await stat(file).then(() => true, () => false);
      if (exists && req.method === "POST" && req.headers["x-upsert"] !== "true") {
        return send(res, 400, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
      }
      let data = await body(req);
      let type = req.headers["content-type"] ?? "application/octet-stream";
      if (type.startsWith("multipart/form-data")) {
        // supabase-js envia File/Blob como multipart; extrai o primeiro arquivo
        const boundary = type.split("boundary=")[1];
        const raw = data.toString("latin1");
        const part = raw.split(`--${boundary}`).find((p) => p.includes("filename="));
        const headEnd = part.indexOf("\r\n\r\n");
        const partType = /content-type:\s*([^\r\n]+)/i.exec(part.slice(0, headEnd))?.[1];
        data = Buffer.from(part.slice(headEnd + 4, part.lastIndexOf("\r\n")), "latin1");
        type = partType ?? type;
      }
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, data);
      types.set(file, type);
      return send(res, 200, { Key: `${m[1]}/${m[2]}`, Id: m[2] });
    }

    // remoção: DELETE /object/{bucket}  { prefixes: [...] }
    if (req.method === "DELETE" && (m = path.match(/^\/object\/([^/]+)\/?$/))) {
      if (!canWrite) return send(res, 403, { statusCode: "403", error: "Unauthorized", message: "forbidden" });
      const { prefixes = [] } = JSON.parse((await body(req)).toString() || "{}");
      for (const p of prefixes) await rm(safe(`${m[1]}/${p}`), { force: true });
      return send(res, 200, prefixes.map((name) => ({ name })));
    }

    send(res, 404, { statusCode: "404", error: "not_found", message: `rota não simulada: ${req.method} ${path}` });
  } catch (e) {
    send(res, 500, { statusCode: "500", error: "internal", message: String(e) });
  }
}).listen(PORT, () => console.log(`storage-stub em :${PORT} (${ROOT})`));
