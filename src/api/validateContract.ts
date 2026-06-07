import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

const contractFiles = [
  "docs/api/openapi.json",
  "docs/api/examples/health.response.json",
  "docs/api/examples/recommendation.request.json",
  "docs/api/examples/recommendation.response.summary.json",
  "docs/api/examples/error.invalid-request.json",
  "src/api/schemas/healthResponse.schema.json",
  "src/api/schemas/recommendationRequest.schema.json",
  "src/api/schemas/recommendationResponse.schema.json",
  "src/api/schemas/apiErrorResponse.schema.json",
];

for (const relativePath of contractFiles) {
  const absolutePath = join(rootDir, relativePath);
  const contents = readFileSync(absolutePath, "utf8");
  JSON.parse(contents);
}

console.log(`Validated ${contractFiles.length} API contract files.`);
