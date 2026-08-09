import { defineConfig, devices } from "@playwright/test";

/**
 * Local-only: exercises real Google Maps services (map rendering,
 * geocoding), so it needs your own .env.local (a real
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) plus the map and/or submitPebble
 * flags on in your local database (DB-backed, not env vars — see
 * docs/design.md's "Dynamic feature flags" amendment; `npm run
 * db:seed` sets both `"true"`, or toggle them yourself at `/admin` →
 * Settings). Not run in CI — see docs/design.md. Run with
 * `npm run test:e2e:map` (each spec skips itself if the key it needs
 * isn't configured).
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/map.spec.ts", "**/submit-place-lookup.spec.ts"],
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Always launch fresh so the pinned FEATURE_AUTH_GATE below is
    // guaranteed to apply; reusing a pre-running `npm run dev` would
    // ignore it.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      FEATURE_AUTH_GATE: "false",
    },
  },
});
