import { del, list } from "@vercel/blob";
import { RAW_UPLOAD_PATH_PREFIX } from "@/lib/pebble-photo-constraints";

/**
 * Don't list uploads younger than this as orphans — a submission still
 * in progress (photo picked, still filling in the rest of the form)
 * looks identical to an abandoned one until enough time has passed.
 * An hour is generous headroom over how long filling in the rest of a
 * five-field form actually takes; the original 24h choice here just
 * made the whole feature useless for a while after every real upload.
 */
const MIN_ORPHAN_AGE_MS = 60 * 60 * 1000;

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
export async function listOrphanedPhotoUploads(): Promise<OrphanedPhotoUpload[]> {
  const cutoff = Date.now() - MIN_ORPHAN_AGE_MS;
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

/** Returns how many were deleted, for a confirmation message. */
export async function deleteAllOrphanedPhotoUploads(): Promise<number> {
  const orphans = await listOrphanedPhotoUploads();
  await Promise.all(orphans.map((orphan) => del(orphan.url)));
  return orphans.length;
}
