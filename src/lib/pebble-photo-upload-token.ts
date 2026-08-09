import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/pebble-photo-constraints";

/**
 * Shared body of the two client-upload token routes (submit, admin —
 * see pebble-photos.ts's module comment for why raw photo bytes go
 * straight from the browser to Blob instead of through a Server
 * Action). `authorize` carries each route's own authorization policy;
 * it must throw to reject the upload — same "throws to reject"
 * contract as src/lib/auth-guards.ts's requireAllowedUser/requireAdmin.
 */
export async function createPebblePhotoUploadTokenResponse(
  request: Request,
  authorize: () => Promise<void>,
) {
  const body = (await request.json()) as HandleUploadBody;

  return handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => {
      await authorize();

      return {
        allowedContentTypes: [...ALLOWED_MIME_TYPES],
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        addRandomSuffix: true,
      };
    },
  });
}
