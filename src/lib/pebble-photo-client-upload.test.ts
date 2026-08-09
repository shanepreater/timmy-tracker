import { describe, expect, it, vi } from "vitest";

const upload = vi.fn();
vi.mock("@vercel/blob/client", () => ({ upload }));

const { uploadRawPebblePhoto } = await import("./pebble-photo-client-upload");

describe("uploadRawPebblePhoto", () => {
  it("uploads privately via the submit token route and returns the download URL", async () => {
    upload.mockResolvedValue({
      url: "https://blob.example/pebbles-raw/tim.jpg",
      downloadUrl: "https://blob.example/pebbles-raw/tim.jpg?download=1",
    });
    const file = new File([new Uint8Array([1, 2, 3])], "tim.jpg", { type: "image/jpeg" });

    const url = await uploadRawPebblePhoto(file, "submit");

    // Must land under pebbles-raw/ — that's the exact prefix the orphan
    // lister (pebble-photo-orphans.ts) filters on. This assertion is
    // the regression test for a real bug: the upload never applied any
    // prefix, so every raw upload landed at the store root and the
    // orphan cleanup UI could never find any of them.
    expect(upload).toHaveBeenCalledWith("pebbles-raw/tim.jpg", file, {
      access: "private",
      handleUploadUrl: "/api/pebble-photo/upload-token/submit",
    });
    expect(url).toBe("https://blob.example/pebbles-raw/tim.jpg?download=1");
  });

  // Regression test: a photo captured on iOS can report a validated
  // file.type (image/jpeg) while file.name still carries HEIC's
  // extension — see pathnameForUpload's comment in
  // pebble-photo-constraints.ts. Building the blob pathname straight
  // from file.name got token generation rejected server-side (Vercel
  // Blob infers content type from the pathname's extension), even
  // though the file itself validated fine client-side.
  it("normalizes the pathname's extension to match the validated file type, not the original filename", async () => {
    upload.mockResolvedValue({
      url: "https://blob.example/pebbles-raw/img-1234.jpg",
      downloadUrl: "https://blob.example/pebbles-raw/img-1234.jpg?download=1",
    });
    const file = new File([new Uint8Array([1])], "IMG_1234.HEIC", { type: "image/jpeg" });

    await uploadRawPebblePhoto(file, "submit");

    expect(upload).toHaveBeenCalledWith(
      "pebbles-raw/IMG_1234.jpg",
      file,
      expect.objectContaining({ handleUploadUrl: "/api/pebble-photo/upload-token/submit" }),
    );
  });

  it("uploads via the admin token route for admin context", async () => {
    upload.mockResolvedValue({
      url: "https://blob.example/pebbles-raw/tim.jpg",
      downloadUrl: "https://blob.example/pebbles-raw/tim.jpg?download=1",
    });
    const file = new File([new Uint8Array([1])], "tim.jpg", { type: "image/jpeg" });

    await uploadRawPebblePhoto(file, "admin");

    expect(upload).toHaveBeenCalledWith(
      "pebbles-raw/tim.jpg",
      file,
      expect.objectContaining({ handleUploadUrl: "/api/pebble-photo/upload-token/admin" }),
    );
  });
});
