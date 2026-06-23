import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@laminar/frontend-safe": fileURLToPath(
        new URL("./src/frontend-safe/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "frontend/src/**/*.test.ts"],
  },
});
