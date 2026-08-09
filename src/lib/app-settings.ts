import { prisma } from "@/lib/prisma";

/**
 * Generic admin-adjustable key/value config (AppSetting table) — see
 * prisma/schema.prisma. Typed, feature-specific wrappers (e.g.
 * pebble-photo-orphans.ts's getOrphanMinAgeMinutes/set...) belong next
 * to the feature that uses them, not here; this is just the plain
 * get/set-by-key primitive.
 */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch (error) {
    // Fails closed, not crashed — getDynamicFeatureFlags() (and every
    // page that renders regardless of flag state, e.g. the home page
    // when the map flag is off) shouldn't hard-require a working
    // Postgres connection just to read config. Same "missing row"
    // fail-closed behavior every caller already handles, just also
    // covering "couldn't reach the row" (no DATABASE_URL configured,
    // e.g. the CI-safe e2e tier's webServer — see playwright.config.ts
    // — or the database is genuinely down).
    console.error(`getSetting(${key}) failed, treating as unset:`, error);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
