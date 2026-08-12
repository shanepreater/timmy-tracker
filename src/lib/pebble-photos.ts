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
    const processed = await sharp(input)
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: OUTPUT_IMAGE_QUALITY })
      .toBuffer();
    // sharp's native bindings can hand back a Buffer view over a
    // SharedArrayBuffer (its worker-thread pool transfers memory this
    // way). fetch() rejects a SharedArrayBuffer-backed body outright
    // ("TypeError: ArrayBuffer: SharedArrayBuffer is not allowed"),
    // which put() below hits — reproduces in Vercel's production
    // runtime, not local `next dev` (different Node worker/isolate
    // behavior). Buffer.from(buffer) copies into a fresh, plain
    // allocation, guaranteed not shared, before it's ever used as a
    // request body.
    output = Buffer.from(processed);
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

/**
 * Batch sibling of processUploadedPebblePhoto, for a pebble's
 * additional photos — runs every raw URL concurrently (independent
 * work, no reason to serialize). If any fail, best-effort deletes the
 * *processed* blobs that did succeed in this same batch before
 * re-throwing the first failure, rather than leaving them behind.
 * Multi-photo is the first place this can happen: with only ever one
 * photo per pebble, a mid-batch partial failure was never possible.
 * Those leaked blobs would also never get cleaned up automatically —
 * the orphan-cleanup admin feature (pebble-photo-orphans.ts) only
 * scans the pebbles-raw/ prefix (raw uploads), never pebbles/
 * (already-processed images).
 */
export async function processUploadedPebblePhotos(rawUrls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(rawUrls.map((rawUrl) => processUploadedPebblePhoto(rawUrl)));

  const succeeded = results.filter(
    (result): result is PromiseFulfilledResult<string> => result.status === "fulfilled",
  );
  const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");

  if (failed) {
    await Promise.allSettled(succeeded.map((result) => deletePebblePhoto(result.value)));
    throw failed.reason;
  }

  return succeeded.map((result) => result.value);
}
