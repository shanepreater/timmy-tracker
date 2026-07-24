import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Separate from vitest.config.ts because these tests hit a real Postgres
 * (via DATABASE_URL) rather than mocking Prisma — run with
 * `npm run test:integration` against a DB that has migrations applied.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./vitest.integration.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
