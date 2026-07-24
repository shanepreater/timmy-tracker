import { test, expect } from "@playwright/test";

// Runs in CI: no external services needed, every flag stays at its default (off).
test("home page shows the intro copy and the map placeholder by default", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Timmy Tracker" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Map coming soon.");
});
