import { prisma } from "@/lib/prisma";
import { getSetting, setSetting } from "@/lib/app-settings";

/**
 * Admin-adjustable cap on how many additional photos (beyond the
 * primary Pebble.photoUrl) a pebble can have. A real, persisted
 * AppSetting (see prisma/seed.ts for the initial value) rather than a
 * constant, same reasoning as ORPHANED_IMAGE_DELAY_MINS in
 * pebble-photo-orphans.ts — what the right cap is is a judgment call
 * for whoever's actually using the site, not something one hardcoded
 * number gets right forever.
 */
const MAX_ADDITIONAL_PHOTOS_SETTING_KEY = "MAX_ADDITIONAL_PEBBLE_PHOTOS";
export const DEFAULT_MAX_ADDITIONAL_PHOTOS = 5;

/** Missing/corrupt/negative setting falls back to the documented default. */
export async function getMaxAdditionalPhotos(): Promise<number> {
  const raw = await getSetting(MAX_ADDITIONAL_PHOTOS_SETTING_KEY);
  const parsed = raw !== null ? Number(raw) : NaN;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_MAX_ADDITIONAL_PHOTOS;
}

export async function setMaxAdditionalPhotos(count: number): Promise<void> {
  if (!Number.isFinite(count) || count < 0) {
    throw new Error("count must be a non-negative number.");
  }
  await setSetting(MAX_ADDITIONAL_PHOTOS_SETTING_KEY, String(Math.floor(count)));
}

export type PebbleAdditionalPhotoRecord = { id: string; url: string; position: number };

export async function listAdditionalPhotos(pebbleId: string): Promise<PebbleAdditionalPhotoRecord[]> {
  return prisma.pebbleAdditionalPhoto.findMany({
    where: { pebbleId },
    orderBy: { position: "asc" },
    select: { id: true, url: true, position: true },
  });
}

/**
 * Appends after any existing additional photos for this pebble, in the
 * order given. Caller enforces the max-count cap — this just persists
 * whatever it's handed.
 */
export async function addAdditionalPhotos(pebbleId: string, urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const existingCount = await prisma.pebbleAdditionalPhoto.count({ where: { pebbleId } });
  await prisma.pebbleAdditionalPhoto.createMany({
    data: urls.map((url, index) => ({ pebbleId, url, position: existingCount + index })),
  });
}

/**
 * Read-only lookup, deliberately separate from deleteAdditionalPhotoRow
 * — mirrors pebbles.ts's getPebblePhotoUrl/removePebblePhoto split, so
 * callers delete the Blob object between the lookup and the DB delete
 * (Blob-before-DB, same order/reasoning as removePebblePhotoAction: a
 * DB delete failing after a successful Blob delete just leaves a row
 * pointing at a 404ing url, which PebblePhoto's fallback already
 * handles gracefully — the reverse order risks a permanently orphaned
 * Blob object with nothing left pointing at it to ever clean up).
 */
export async function getAdditionalPhotoUrl(id: string): Promise<string | null> {
  const photo = await prisma.pebbleAdditionalPhoto.findUnique({ where: { id }, select: { url: true } });
  return photo?.url ?? null;
}

export async function deleteAdditionalPhotoRow(id: string): Promise<void> {
  await prisma.pebbleAdditionalPhoto.delete({ where: { id } });
}
