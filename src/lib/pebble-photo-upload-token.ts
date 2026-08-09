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

  try {
    return await handleUpload({
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
  } catch (error) {
    // The client-side upload() helper (@vercel/blob/client) discards
    // our response body on a non-2xx status and throws its own generic
    // "Failed to retrieve the client token" instead — so the real
    // cause is only ever visible here, server-side. Logged with enough
    // request context (pathname/multipart, user agent) to tell mobile-
    // vs-desktop and auth-vs-Blob-API failures apart without needing a
    // repro.
    console.error("[pebble-photo-upload-token] token generation failed", {
      message: (error as Error).message,
      type: body.type,
      pathname: body.type === "blob.generate-client-token" ? body.payload?.pathname : undefined,
      multipart: body.type === "blob.generate-client-token" ? body.payload?.multipart : undefined,
      userAgent: request.headers.get("user-agent"),
    });
    throw error;
  }
}
