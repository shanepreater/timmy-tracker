import { defineConfig, devices } from "@playwright/test";

/**
 * Local-only: exercises the real Google Maps integration, so it needs
 * your own .env.local (NEXT_PUBLIC_FEATURE_MAP=true + a real
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY). Not run in CI — see docs/design.md.
 * Run with `npm run test:e2e:map` (skips itself if no key is configured).
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/map.spec.ts"],
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
