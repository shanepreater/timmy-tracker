import { beforeEach, describe, expect, it, vi } from "vitest";

const del = vi.fn();
const put = vi.fn();

const rotate = vi.fn();
const resize = vi.fn();
const webp = vi.fn();
const toBuffer = vi.fn();
const sharp = vi.fn();

vi.mock("@vercel/blob", () => ({ del, put }));
vi.mock("sharp", () => ({
  default: (...args: unknown[]) => sharp(...args),
}));

const {
  validatePebblePhoto,
  uploadPebblePhoto,
  deletePebblePhoto,
  PhotoValidationError,
  MAX_UPLOAD_BYTES,
} = await import("./pebble-photos");

function makeFile(options: { name?: string; type?: string; size?: number } = {}) {
  const { name = "tim.jpg", type = "image/jpeg", size } = options;
  const content = new Uint8Array(size ?? 32);
  return new File([content], name, { type });
}

describe("validatePebblePhoto", () => {
  it("accepts jpeg/png/webp files up to 8MB", () => {
    expect(validatePebblePhoto(makeFile({ type: "image/jpeg" }))).toEqual({});
    expect(validatePebblePhoto(makeFile({ type: "image/png" }))).toEqual({});
    expect(validatePebblePhoto(makeFile({ type: "image/webp" }))).toEqual({});
    expect(validatePebblePhoto(makeFile({ size: MAX_UPLOAD_BYTES }))).toEqual({});
  });

  it("rejects unsupported mime types", () => {
    expect(validatePebblePhoto(makeFile({ type: "image/gif" }))).toEqual({
      error: "Upload a JPG, PNG, or WebP image.",
    });
  });

  it("rejects files larger than 8MB", () => {
    expect(validatePebblePhoto(makeFile({ size: MAX_UPLOAD_BYTES + 1 }))).toEqual({
      error: "Photo must be 8 MB or smaller.",
    });
  });
});

describe("uploadPebblePhoto", () => {
  beforeEach(() => {
    put.mockReset();
    del.mockReset();
    sharp.mockReset();
    rotate.mockReset();
    resize.mockReset();
    webp.mockReset();
    toBuffer.mockReset();

    sharp.mockReturnValue({ rotate });
    rotate.mockReturnValue({ resize });
    resize.mockReturnValue({ webp });
    webp.mockReturnValue({ toBuffer });
    toBuffer.mockResolvedValue(Buffer.from("processed"));
    put.mockResolvedValue({ url: "https://blob.example/pebbles/photo.webp" });
  });

  it("re-encodes to webp and uploads publicly", async () => {
    const url = await uploadPebblePhoto(makeFile({ name: "Tim Photo.JPG", type: "image/jpeg" }));

    expect(sharp).toHaveBeenCalledTimes(1);
    expect(rotate).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledWith({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    });
    expect(webp).toHaveBeenCalledWith({ quality: 80 });
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^pebbles\/\d+-[a-f0-9]{8}-tim-photo\.webp$/),
      Buffer.from("processed"),
      { access: "public", contentType: "image/webp" },
    );
    expect(url).toBe("https://blob.example/pebbles/photo.webp");
  });

  it("throws PhotoValidationError for invalid files", async () => {
    await expect(uploadPebblePhoto(makeFile({ type: "image/gif" }))).rejects.toBeInstanceOf(
      PhotoValidationError,
    );
    expect(put).not.toHaveBeenCalled();
    expect(sharp).not.toHaveBeenCalled();
  });
});

describe("deletePebblePhoto", () => {
  it("deletes the blob URL", async () => {
    await deletePebblePhoto("https://blob.example/pebbles/photo.webp");

    expect(del).toHaveBeenCalledWith("https://blob.example/pebbles/photo.webp");
  });
});
