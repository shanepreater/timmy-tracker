import { del, list } from "@vercel/blob";

/**
 * Same prefix PebblePhotoField's client uploads land under (see
 * pebble-photos.ts's client-upload amendment). A raw upload only ever
 * gets deleted by processUploadedPebblePhoto() once the form it was
 * attached to is actually submitted — an abandoned form (tab closed,
 * different photo picked instead) leaves one behind here permanently
 * otherwise.
 */
const RAW_UPLOAD_PREFIX = "pebbles-raw/";

/**
 * Don't list uploads younger than this as orphans — a submission still
 * in progress (photo picked, still filling in the rest of the form)
 * looks identical to an abandoned one until enough time has passed.
 */
const MIN_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

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
  const { blobs } = await list({ prefix: RAW_UPLOAD_PREFIX });

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
