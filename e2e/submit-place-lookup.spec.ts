import { test, expect } from "@playwright/test";
import { config } from "dotenv";

// See playwright.map.config.ts — local-only, needs a real API key with
// the Geocoding API enabled (in addition to the Maps JavaScript API).
config({ path: ".env.local" });

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

test.skip(!apiKey, "requires a real NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — local only, not run in CI");

test("looking up a place name fills in coordinates via the real Geocoding API", async ({ page }) => {
  await page.goto("/submit");

  await page.getByPlaceholder(/eiffel tower/i).fill("Eiffel Tower, Paris");
  await page.getByRole("button", { name: /look up/i }).click();

  await expect(page.getByText(/Resolved to:/)).toBeVisible({ timeout: 15_000 });

  const latitude = Number(await page.getByRole("textbox", { name: "Latitude" }).inputValue());
  const longitude = Number(await page.getByRole("textbox", { name: "Longitude" }).inputValue());

  expect(latitude).toBeCloseTo(48.8584, 1);
  expect(longitude).toBeCloseTo(2.2945, 1);

  await page.screenshot({ path: "test-results/submit-place-lookup.png" });
});
