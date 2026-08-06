import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

config({ path: ".env" });
config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

test.skip(
  !databaseUrl || !blobToken,
  "requires local Postgres (DATABASE_URL) and BLOB_READ_WRITE_TOKEN — local only, not run in CI",
);

const MARKER = "e2e-photo-upload";
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;

test.beforeAll(async () => {
  if (!prisma) return;

  // Clean before test-run so interrupted runs leave artifacts for debugging.
  await prisma.pebble.deleteMany({ where: { depositedBy: MARKER } });
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

test("submit flow uploads a real photo and persists photoUrl", async ({ page }) => {
  await page.goto("/submit");

  await page.getByRole("textbox", { name: "Latitude" }).fill("10");
  await page.getByRole("textbox", { name: "Longitude" }).fill("20");
  await page.getByRole("textbox", { name: "Deposited by" }).fill(MARKER);
  await page.getByLabel("Date deposited").fill("2026-01-01");

  const pngBytes = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 10, g: 140, b: 220, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  await page
    .getByLabel("Photo (optional)")
    .setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: pngBytes });

  await page.getByRole("button", { name: "Submit pebble" }).click();

  await expect(page.getByRole("status")).toHaveText(/awaiting review/i);

  const stored = await prisma!.pebble.findFirst({
    where: { depositedBy: MARKER },
    orderBy: { createdAt: "desc" },
  });

  expect(stored).not.toBeNull();
  expect(stored?.photoUrl).toMatch(/^https:\/\//);

  const response = await page.request.get(
    `/api/pebble-photo?url=${encodeURIComponent(stored!.photoUrl!)}`,
  );
  expect(response.ok()).toBe(true);
});
