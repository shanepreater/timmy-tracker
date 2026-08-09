import { del, list } from "@vercel/blob";
import { RAW_UPLOAD_PATH_PREFIX } from "@/lib/pebble-photo-constraints";
import { getSetting, setSetting } from "@/lib/app-settings";

/**
 * Admin-adjustable "don't list uploads younger than this as orphans"
 * floor — a submission still in progress (photo picked, still filling
 * in the rest of the form) looks identical to an abandoned one until
 * enough time has passed. What counts as "clearly abandoned" is a
 * judgment call for whoever's actually using this, not something one
 * hardcoded number gets right for everyone — hence a real, persisted
 * AppSetting (see prisma/seed.ts for the initial value) rather than a
 * constant in code.
 */
const ORPHAN_MIN_AGE_SETTING_KEY = "ORPHANED_IMAGE_DELAY_MINS";

export async function getOrphanMinAgeMinutes(): Promise<number> {
  const raw = await getSetting(ORPHAN_MIN_AGE_SETTING_KEY);
  const parsed = raw !== null ? Number(raw) : NaN;
  // Missing/corrupt setting fails open (0 = show everything) rather
  // than silently hiding orphans behind a guessed number — there's no
  // "right" fallback threshold to duplicate here.
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function setOrphanMinAgeMinutes(minutes: number): Promise<void> {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error("minAgeMinutes must be a non-negative number.");
  }
  await setSetting(ORPHAN_MIN_AGE_SETTING_KEY, String(Math.floor(minutes)));
}

export type OrphanedPhotoUpload = {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
};

/**
 * A single list() call (default limit 1000) — this project's scale
 * (150 pebbles total, README's "Assumptions") means orphan counts will
 * never approach pagination territory in practice.
 */
export async function listOrphanedPhotoUploads(minAgeMinutes: number): Promise<OrphanedPhotoUpload[]> {
  const cutoff = Date.now() - minAgeMinutes * 60 * 1000;
  const { blobs } = await list({ prefix: RAW_UPLOAD_PATH_PREFIX });

  return blobs
    .filter((blob) => blob.uploadedAt.getTime() < cutoff)
    .map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }))
    .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
}

export async function deleteOrphanedPhotoUpload(url: string): Promise<void> {
  await del(url);
}

/**
 * Deletes exactly what's currently listed at the given threshold —
 * callers pass the same value they fetched the visible list with, so
 * "Delete all" always matches what the admin can actually see.
 * Returns how many were deleted, for a confirmation message.
 */
export async function deleteAllOrphanedPhotoUploads(minAgeMinutes: number): Promise<number> {
  const orphans = await listOrphanedPhotoUploads(minAgeMinutes);
  await Promise.all(orphans.map((orphan) => del(orphan.url)));
  return orphans.length;
}
