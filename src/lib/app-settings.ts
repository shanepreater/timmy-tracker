import { prisma } from "@/lib/prisma";

/**
 * Generic admin-adjustable key/value config (AppSetting table) — see
 * prisma/schema.prisma. Typed, feature-specific wrappers (e.g.
 * pebble-photo-orphans.ts's getOrphanMinAgeMinutes/set...) belong next
 * to the feature that uses them, not here; this is just the plain
 * get/set-by-key primitive.
 */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
