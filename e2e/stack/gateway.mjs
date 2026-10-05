// Gateway no papel do Kong do Supabase: um só endereço, rotas por prefixo, CORS.
import http from "node:http";

const PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const ROUTES = [
  ["/auth/v1", Number(process.env.AUTH_PORT ?? 9999)],
  ["/rest/v1", Number(process.env.REST_PORT ?? 3001)],
  ["/storage/v1", Number(process.env.STORAGE_PORT ?? 5005)],
];
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,apikey,content-type,x-client-info,x-upsert,prefer,range,accept-profile,content-profile,cache-control,x-supabase-api-version",
  "access-control-expose-headers": "content-range,x-total-count",
};

http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  const route = ROUTES.find(([prefix]) => req.url.startsWith(prefix + "/") || req.url === prefix);
  if (!route) {
    res.writeHead(404, CORS);
    return res.end("rota desconhecida");
  }
  const [prefix, port] = route;
  const headers = { ...req.headers, host: `localhost:${port}` };
  const upstream = http.request(
    { host: "127.0.0.1", port, method: req.method, path: req.url.slice(prefix.length) || "/", headers },
    (up) => {
      res.writeHead(up.statusCode ?? 502, { ...up.headers, ...CORS });
      up.pipe(res);
    },
  );
  upstream.on("error", (e) => {
    res.writeHead(502, CORS);
    res.end(`upstream ${prefix} indisponível: ${e.message}`);
  });
  req.pipe(upstream);
}).listen(PORT, () => console.log(`gateway em :${PORT}`));
