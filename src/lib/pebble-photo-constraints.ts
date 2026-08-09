/**
 * Photo upload constraints shared between client components (immediate
 * pre-upload feedback) and server code (Vercel Blob client-token
 * config — see src/lib/pebble-photo-upload-token.ts). No server-only
 * imports (sharp, @vercel/blob's put/get/del) so this is safe to pull
 * into "use client" components.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Raw client uploads (pebble-photo-client-upload.ts) live under this
 * prefix — a single source of truth so the uploader and the orphan
 * lister (pebble-photo-orphans.ts) can't drift apart. They did once:
 * the uploader never actually applied a prefix, silently landing raw
 * files at the store root, where the orphan lister's prefix filter
 * could never find them.
 */
export const RAW_UPLOAD_PATH_PREFIX = "pebbles-raw/";

/** Pure — no I/O. Returns an error message, or null if the file is fine. */
export function validatePhotoFile(file: File): string | null {
  if (file.size === 0) {
    return "Photo file is empty.";
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return "Upload a JPG, PNG, or WebP image.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return "Photo must be 8 MB or smaller.";
  }

  return null;
}
