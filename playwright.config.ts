import { defineConfig, devices } from "@playwright/test";

/**
 * CI-safe E2E tests only — no external services, so every feature flag
 * is forced off here regardless of what your local .env.local has set.
 * Tests needing a real (paid) Google Maps API key live under
 * playwright.map.config.ts instead — kept out of this default run/CI
 * on purpose (see docs/design.md).
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/map.spec.ts", "**/submit-place-lookup.spec.ts"],
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
      NEXT_PUBLIC_FEATURE_MAP: "false",
      NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE: "false",
    },
  },
});
