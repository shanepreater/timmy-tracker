import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validatePhotoFile } from "./pebble-photo-constraints";

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
