import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2000;
export const OUTPUT_IMAGE_QUALITY = 80;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const PRIVATE_STORE_ACCESS_ERROR = "Cannot use public access on a private store";

export class PhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoValidationError";
  }
}

export function validatePebblePhoto(file: File): { error?: string } {
  if (file.size === 0) {
    return { error: "Photo file is empty." };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { error: "Upload a JPG, PNG, or WebP image." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Photo must be 8 MB or smaller." };
  }

  return {};
}

function buildBlobPath(file: File): string {
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const stem = base || "pebble-photo";
  return `pebbles/${Date.now()}-${randomUUID().slice(0, 8)}-${stem}.webp`;
}

export async function uploadPebblePhoto(file: File): Promise<string> {
  const validation = validatePebblePhoto(file);
  if (validation.error) {
    throw new PhotoValidationError(validation.error);
  }

  const arrayBuffer =
    typeof file.arrayBuffer === "function"
      ? await file.arrayBuffer()
      : await new Response(file).arrayBuffer();
  const input = Buffer.from(arrayBuffer);
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

  const path = buildBlobPath(file);

  try {
    const uploaded = await put(path, output, {
      access: "public",
      contentType: "image/webp",
    });

    return uploaded.url;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes(PRIVATE_STORE_ACCESS_ERROR)) {
      throw error;
    }

    // Some Blob stores are configured private-only; use a private upload
    // and store the SDK-provided access URL in that case.
    const uploaded = await put(path, output, {
      access: "private",
      contentType: "image/webp",
    });

    return uploaded.downloadUrl;
  }
}

export async function deletePebblePhoto(url: string): Promise<void> {
  await del(url);
}
