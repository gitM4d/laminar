import { buildApiServer } from "./buildApiServer.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

const app = buildApiServer();

await app.listen({ port, host });

console.log(`laminar-api listening on http://${host}:${port}`);
