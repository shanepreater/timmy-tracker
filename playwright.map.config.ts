import { defineConfig, devices } from "@playwright/test";

/**
 * Local-only: exercises real Google Maps services (map rendering,
 * geocoding), so it needs your own .env.local (a real
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, plus NEXT_PUBLIC_FEATURE_MAP and/or
 * NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE depending on the spec). Not run in
 * CI — see docs/design.md. Run with `npm run test:e2e:map` (each spec
 * skips itself if the key it needs isn't configured).
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
    // Always launch fresh so the pinned feature-flag env below is guaranteed
    // to apply; reusing a pre-running `npm run dev` would ignore it.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      FEATURE_AUTH_GATE: "false",
      NEXT_PUBLIC_FEATURE_MAP: "true",
      NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE: "true",
    },
  },
});
