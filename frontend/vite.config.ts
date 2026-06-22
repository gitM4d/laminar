import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const frontendRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: frontendRoot,
  resolve: {
    alias: {
      "@laminar/frontend-safe": fileURLToPath(
        new URL("../src/frontend-safe/index.ts", import.meta.url),
      ),
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/health": "http://127.0.0.1:3000",
      "/recommendation": "http://127.0.0.1:3000",
    },
  },
  build: {
    outDir: "../dist/frontend",
    emptyOutDir: true,
  },
});
