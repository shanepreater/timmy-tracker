import { upload } from "@vercel/blob/client";
import { RAW_UPLOAD_PATH_PREFIX } from "@/lib/pebble-photo-constraints";

export type PebblePhotoUploadContext = "submit" | "admin";

const HANDLE_UPLOAD_URL: Record<PebblePhotoUploadContext, string> = {
  submit: "/api/pebble-photo/upload-token/submit",
  admin: "/api/pebble-photo/upload-token/admin",
};

/**
 * Uploads the raw file straight from the browser to Blob storage,
 * authorized by the matching upload-token route — bypasses Vercel
 * Functions' hard 4.5 MB request-body limit entirely, since the bytes
 * never pass through a Server Action. Returns the raw blob's URL; the
 * server re-fetches, resizes, and re-encodes it in
 * processUploadedPebblePhoto() once the form is actually submitted.
 * Always requests private access — this upload is a transient
 * intermediate never shown to end users, so there's no reason it
 * needs to work on a public-only store, and requesting private avoids
 * needing the same public/private fallback dance the final processed
 * image's server-side put() does.
 */
export async function uploadRawPebblePhoto(
  file: File,
  context: PebblePhotoUploadContext,
): Promise<string> {
  // The token route (onBeforeGenerateToken) can't rewrite this pathname
  // — it's whatever the client requests, not something the server can
  // override — so RAW_UPLOAD_PATH_PREFIX has to be applied here.
  const blob = await upload(`${RAW_UPLOAD_PATH_PREFIX}${file.name}`, file, {
    access: "private",
    handleUploadUrl: HANDLE_UPLOAD_URL[context],
  });

  return blob.downloadUrl;
}
