import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pruebas que tocan la base real. Separadas para que `npm test` siga siendo
// rápido y funcione sin red ni credenciales.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
