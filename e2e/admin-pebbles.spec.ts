import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { encode } from "@auth/core/jwt";
import type { BrowserContext } from "@playwright/test";

// See playwright.admin.config.ts — local-only. DATABASE_URL usually
// lives in .env (Prisma CLI convention, see .env.example), everything
// else in .env.local; load both so this script sees them regardless of
// which file the developer put each in.
config({ path: ".env" });
config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.AUTH_SECRET;
const adminFlagOn = process.env.FEATURE_ADMIN === "true";

test.skip(
  !databaseUrl || !authSecret || !adminFlagOn,
  "requires local Postgres (DATABASE_URL), AUTH_SECRET, and FEATURE_ADMIN=true — local only, not run in CI",
);

const ADMIN_EMAIL = "e2e-admin@example.com";
const ADD_MARKER = "e2e-admin-pebble-add";
const PENDING_MARKER = "e2e-admin-pebble-pending";

const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;

test.beforeAll(async () => {
  if (!prisma) return;

  // Clean before, not after — see CLAUDE.md: a crash here leaves its
  // data in place for post-mortem debugging instead of a passing
  // afterAll wiping the evidence.
  await prisma.pebble.deleteMany({
    where: { depositedBy: { in: [ADD_MARKER, PENDING_MARKER] } },
  });
  await prisma.allowedUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: { isAdmin: true },
    create: { email: ADMIN_EMAIL, isAdmin: true, name: "E2E Admin" },
  });
  await prisma.pebble.create({
    data: {
      latitude: 1,
      longitude: 1,
      depositedBy: PENDING_MARKER,
      depositedAt: new Date("2026-01-01"),
      status: "PENDING",
    },
  });
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

/**
 * Signs in as the seeded admin without touching real Google OAuth — a
 * NextAuth JWT session cookie, signed with the app's own AUTH_SECRET,
 * using the same cookie name/salt convention @auth/core uses for an
 * unprefixed (non-https) session token. See docs/design-admin-pebbles.md.
 */
async function signInAsAdmin(context: BrowserContext) {
  const cookieName = "authjs.session-token";
  const token = await encode({
    secret: authSecret!,
    salt: cookieName,
    token: { email: ADMIN_EMAIL, name: "E2E Admin", sub: ADMIN_EMAIL },
    maxAge: 60 * 60,
  });

  await context.addCookies([
    {
      name: cookieName,
      value: token,
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("admin can verify a pending pebble, add one, and move it", async ({ page, context }) => {
  await signInAsAdmin(context);
  await page.goto("/admin");

  await page.getByRole("link", { name: "Manage pebbles" }).click();
  await expect(page.getByRole("heading", { name: "Manage pebbles" })).toBeVisible();

  const pendingSection = page.locator("section", {
    has: page.getByRole("heading", { name: "Pending pebbles" }),
  });
  const pendingRow = pendingSection.getByRole("listitem").filter({ hasText: PENDING_MARKER });
  await expect(pendingRow).toBeVisible();
  await pendingRow.getByRole("button", { name: "Verify" }).click();

  await expect(pendingSection.getByRole("listitem").filter({ hasText: PENDING_MARKER })).toHaveCount(0);

  await page.getByRole("textbox", { name: "Latitude", exact: true }).fill("10");
  await page.getByRole("textbox", { name: "Longitude", exact: true }).fill("20");
  await page.getByRole("textbox", { name: "Deposited by" }).fill(ADD_MARKER);
  await page.getByLabel("Date deposited").fill("2026-01-01");
  await page.getByRole("button", { name: "Add pebble" }).click();

  await expect(page.getByRole("status")).toHaveText(/pebble added/i);

  const addedRow = page.getByRole("listitem").filter({ hasText: ADD_MARKER });
  await expect(addedRow).toBeVisible();
  await addedRow.getByRole("spinbutton", { name: "Lat" }).fill("33.3");
  await addedRow.getByRole("spinbutton", { name: "Long" }).fill("-44.4");
  await addedRow.getByRole("button", { name: "Save location" }).click();

  await expect(
    page.getByRole("listitem").filter({ hasText: ADD_MARKER }).getByRole("spinbutton", { name: "Lat" }),
  ).toHaveValue("33.3");
  await expect(
    page.getByRole("listitem").filter({ hasText: ADD_MARKER }).getByRole("spinbutton", { name: "Long" }),
  ).toHaveValue("-44.4");

  const addedPebble = await prisma!.pebble.findFirst({ where: { depositedBy: ADD_MARKER } });
  expect(addedPebble).toMatchObject({ status: "VERIFIED", submitterEmail: null });

  const verifiedPending = await prisma!.pebble.findFirst({ where: { depositedBy: PENDING_MARKER } });
  expect(verifiedPending?.status).toBe("VERIFIED");
});
