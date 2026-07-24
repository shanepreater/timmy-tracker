import { test, expect } from "@playwright/test";
import { config } from "dotenv";

// Next.js reads .env.local itself when it starts the dev server (see
// playwright.config.ts's webServer); we load it here too just to decide
// whether to skip this file, since a real Maps key is a paid external
// service we don't want CI depending on (see docs/design.md).
config({ path: ".env.local" });

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

test.skip(!apiKey, "requires a real NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — local only, not run in CI");

test("clicking a pebble marker shows who deposited it and when", async ({ page }) => {
  await page.goto("/");

  const marker = page.getByRole("button", { name: /Sarah/ });
  await marker.waitFor({ state: "visible", timeout: 15_000 });
  await marker.click();

  const infoWindow = page.locator(".gm-style-iw");
  await expect(infoWindow).toBeVisible();
  await expect(infoWindow).toContainText("Sarah");

  await page.screenshot({ path: "test-results/map-info-window.png" });
});
