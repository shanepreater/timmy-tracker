import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, pathnameForUpload, validatePhotoFile } from "./pebble-photo-constraints";

function makeFile(options: { name?: string; type?: string; size?: number } = {}) {
  const { name = "tim.jpg", type = "image/jpeg", size } = options;
  const content = new Uint8Array(size ?? 32);
  return new File([content], name, { type });
}

describe("validatePhotoFile", () => {
  it("accepts jpeg/png/webp files up to 8MB", () => {
    expect(validatePhotoFile(makeFile({ type: "image/jpeg" }))).toBeNull();
    expect(validatePhotoFile(makeFile({ type: "image/png" }))).toBeNull();
    expect(validatePhotoFile(makeFile({ type: "image/webp" }))).toBeNull();
    expect(validatePhotoFile(makeFile({ size: MAX_UPLOAD_BYTES }))).toBeNull();
  });

  it("rejects unsupported mime types", () => {
    expect(validatePhotoFile(makeFile({ type: "image/gif" }))).toBe(
      "Upload a JPG, PNG, or WebP image.",
    );
  });

  it("rejects files larger than 8MB", () => {
    expect(validatePhotoFile(makeFile({ size: MAX_UPLOAD_BYTES + 1 }))).toBe(
      "Photo must be 8 MB or smaller.",
    );
  });

  it("rejects empty files", () => {
    expect(validatePhotoFile(makeFile({ size: 0 }))).toBe("Photo file is empty.");
  });
});

describe("pathnameForUpload", () => {
  it("keeps a matching extension as-is", () => {
    expect(pathnameForUpload("pebbles-raw/", makeFile({ name: "tim.jpg", type: "image/jpeg" }))).toBe(
      "pebbles-raw/tim.jpg",
    );
  });

  // Regression test: Vercel Blob infers content type from the pathname's
  // extension, not File.type, when minting an upload token. iOS defaults
  // to capturing HEIC, so a photo picked there can report a valid
  // file.type (passing validatePhotoFile) while file.name still carries
  // the original ".HEIC" extension — building the blob pathname from
  // that name got token generation rejected server-side, even though
  // the file itself was fine. This is why "works on desktop, fails on
  // the same photo from a phone" reproduced.
  it("replaces a mismatched/HEIC extension with one matching the validated type", () => {
    expect(
      pathnameForUpload("pebbles-raw/", makeFile({ name: "IMG_1234.HEIC", type: "image/jpeg" })),
    ).toBe("pebbles-raw/IMG_1234.jpg");
  });

  it("maps png and webp to their own extensions", () => {
    expect(pathnameForUpload("pebbles-raw/", makeFile({ name: "a", type: "image/png" }))).toBe(
      "pebbles-raw/a.png",
    );
    expect(pathnameForUpload("pebbles-raw/", makeFile({ name: "a.webp", type: "image/webp" }))).toBe(
      "pebbles-raw/a.webp",
    );
  });

  it("falls back to a generic base name when the file has none", () => {
    expect(pathnameForUpload("pebbles-raw/", makeFile({ name: "", type: "image/jpeg" }))).toBe(
      "pebbles-raw/upload.jpg",
    );
  });

  it("throws for a type it wasn't asked to validate first", () => {
    expect(() =>
      pathnameForUpload("pebbles-raw/", makeFile({ name: "tim.gif", type: "image/gif" })),
    ).toThrow('unrecognized/unvalidated file type "image/gif"');
  });
});
