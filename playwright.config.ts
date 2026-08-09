import { defineConfig, devices } from "@playwright/test";

/**
 * CI-safe E2E tests only — no external services and no DATABASE_URL.
 * map/submitPebble/pebblePhotos are DB-backed AppSetting rows now (see
 * docs/design.md's "Dynamic feature flags" amendment), not env vars —
 * with no database reachable here, getSetting() fails closed and every
 * one of them reads as off, same net effect as the old explicit env
 * vars this config used to set. FEATURE_ADMIN/FEATURE_AUTH_GATE are
 * still real env vars and still forced off below.
 * Tests needing a real (paid) Google Maps API key live under
 * playwright.map.config.ts, and the admin pebble-management flow (needs
 * local Postgres + a mocked session) lives under playwright.admin.config.ts
 * — both kept out of this default run/CI on purpose (see docs/design.md).
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: [
    "**/map.spec.ts",
    "**/submit-place-lookup.spec.ts",
    "**/admin-pebbles.spec.ts",
    "**/pebble-photo-upload.spec.ts",
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      FEATURE_ADMIN: "false",
      FEATURE_AUTH_GATE: "false",
    },
  },
});
