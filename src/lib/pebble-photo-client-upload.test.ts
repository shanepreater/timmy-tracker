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

    expect(upload).toHaveBeenCalledWith("tim.jpg", file, {
      access: "private",
      handleUploadUrl: "/api/pebble-photo/upload-token/submit",
    });
    expect(url).toBe("https://blob.example/pebbles-raw/tim.jpg?download=1");
  });

  it("uploads via the admin token route for admin context", async () => {
    upload.mockResolvedValue({
      url: "https://blob.example/pebbles-raw/tim.jpg",
      downloadUrl: "https://blob.example/pebbles-raw/tim.jpg?download=1",
    });
    const file = new File([new Uint8Array([1])], "tim.jpg", { type: "image/jpeg" });

    await uploadRawPebblePhoto(file, "admin");

    expect(upload).toHaveBeenCalledWith(
      "tim.jpg",
      file,
      expect.objectContaining({ handleUploadUrl: "/api/pebble-photo/upload-token/admin" }),
    );
  });
});
