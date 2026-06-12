import "dotenv/config";
import { createLaminarRecommendation } from "../core/index.js";
import { buildDefaultLaminarDataProvider, resolveProviderMode } from "../core/providers/resolveDefaultProvider.js";
import { buildApiServer } from "./buildApiServer.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

const providerMode = resolveProviderMode(process.env);
const dataProvider = await buildDefaultLaminarDataProvider({
  mode: providerMode,
  env: process.env,
});

const app = buildApiServer({
  providerMode,
  createRecommendation: (input) =>
    createLaminarRecommendation({ ...input, dataProvider }),
});

await app.listen({ port, host });

console.log(`laminar-api listening on http://${host}:${port}`);
console.log(`Provider mode: ${providerMode}`);
