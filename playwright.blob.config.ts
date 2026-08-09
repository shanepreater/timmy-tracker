import { defineConfig, devices } from "@playwright/test";

/**
 * Local-only: exercises real Vercel Blob uploads via the submit-pebble
 * flow. Requires DATABASE_URL and BLOB_READ_WRITE_TOKEN in local env,
 * plus the submitPebble and pebblePhotos flags on in your local
 * database (DB-backed, not env vars — see docs/design.md's "Dynamic
 * feature flags" amendment; `npm run db:seed` sets both `"true"`, or
 * toggle them yourself at `/admin` → Settings). Not run in CI (paid
 * external service) — mirrors map/admin local-only configs. Run with
 * `npm run test:e2e:blob`.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/pebble-photo-upload.spec.ts"],
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      FEATURE_AUTH_GATE: "false",
      FEATURE_ADMIN: "false",
    },
  },
});
