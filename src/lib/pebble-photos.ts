import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { del, get, put } from "@vercel/blob";
import sharp from "sharp";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/pebble-photo-constraints";

export { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES };
export const MAX_IMAGE_DIMENSION = 2000;
export const OUTPUT_IMAGE_QUALITY = 80;

export class PhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoValidationError";
  }
}

function buildProcessedBlobPath(sourceName: string): string {
  const base = sourceName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const stem = base || "pebble-photo";
  return `pebbles/${Date.now()}-${randomUUID().slice(0, 8)}-${stem}.webp`;
}

function basenameFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  return pathname.slice(pathname.lastIndexOf("/") + 1);
}

/**
 * Fetches the bytes of a blob uploaded via the client-upload flow.
 * Tries public access first, then private — same store-configuration
 * uncertainty as the public/private put() fallback below, and the
 * same pattern already proven in src/app/api/pebble-photo/route.ts.
 */
async function fetchRawUpload(url: string): Promise<Buffer> {
  let result;
  try {
    result = await get(url, { access: "public" });
  } catch {
    result = await get(url, { access: "private" });
  }

  if (!result?.stream) {
    throw new PhotoValidationError("We couldn't find that upload. Try again.");
  }

  // lib.dom.d.ts's ReadableStream type doesn't declare Symbol.asyncIterator
  // (a known TS gap — every runtime here implements it fine); converting
  // via Node's own stream type sidesteps that rather than casting away
  // type-checking on the actual byte-reading logic below.
  const chunks: Uint8Array[] = [];
  for await (const chunk of Readable.fromWeb(result.stream as unknown as NodeReadableStream<Uint8Array>)) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Takes the URL of a raw file already uploaded to Blob by the browser
 * (see src/lib/pebble-photo-client-upload.ts) — never a File, since
 * the whole point of the client-upload flow is that raw photo bytes
 * never pass through a Server Action body (Vercel Functions hard-cap
 * request bodies at 4.5 MB, well under our 8 MB photo limit — see
 * docs/design-pebble-photos.md's client-upload amendment). Fetches
 * those bytes, resizes/re-encodes via sharp exactly as before,
 * uploads the processed result, and best-effort deletes the raw
 * intermediate upload.
 */
export async function processUploadedPebblePhoto(rawUrl: string): Promise<string> {
  const input = await fetchRawUpload(rawUrl);

  let output: Buffer;
  try {
    output = await sharp(input)
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: OUTPUT_IMAGE_QUALITY })
      .toBuffer();
  } catch {
    throw new PhotoValidationError("We couldn't process that image. Try a different file.");
  }

  const path = buildProcessedBlobPath(basenameFromUrl(rawUrl));

  let finalUrl: string;
  try {
    const uploaded = await put(path, output, {
      access: "public",
      contentType: "image/webp",
    });
    finalUrl = uploaded.url;
  } catch (publicError) {
    // Some Blob stores are configured private-only; fall back to a private
    // upload and store the SDK-provided access URL in that case.
    try {
      const uploaded = await put(path, output, {
        access: "private",
        contentType: "image/webp",
      });
      finalUrl = uploaded.downloadUrl;
    } catch {
      throw publicError;
    }
  }

  try {
    await del(rawUrl);
  } catch {
    // Best-effort cleanup of a transient intermediate upload — not
    // worth failing the whole submission over an orphaned raw file.
  }

  return finalUrl;
}

export async function deletePebblePhoto(url: string): Promise<void> {
  await del(url);
}
