import { defineConfig } from "vitest/config";

// Pruebas que tocan la base real. Separadas para que `npm test` siga siendo
// rápido y funcione sin red ni credenciales.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
