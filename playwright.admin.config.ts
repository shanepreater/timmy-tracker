import { defineConfig, devices } from "@playwright/test";

/**
 * Local-only: exercises the real /admin flow (add/verify/move a pebble)
 * against your own local Postgres, signed in via a mocked NextAuth
 * session cookie rather than real Google OAuth — see
 * e2e/admin-pebbles.spec.ts and docs/design-admin-pebbles.md. Needs
 * DATABASE_URL, AUTH_SECRET, and FEATURE_ADMIN=true in your local env
 * (e.g. .env/.env.local, which `npm run dev` loads automatically). Not
 * run in CI — see docs/design.md's testing section. Run with
 * `npm run test:e2e:admin` (the spec skips itself if the setup it needs
 * isn't available).
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/admin-pebbles.spec.ts"],
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
  },
});
