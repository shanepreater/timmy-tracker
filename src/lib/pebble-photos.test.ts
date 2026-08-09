import { beforeEach, describe, expect, it, vi } from "vitest";

const del = vi.fn();
const put = vi.fn();
const get = vi.fn();

const rotate = vi.fn();
const resize = vi.fn();
const webp = vi.fn();
const toBuffer = vi.fn();
const sharp = vi.fn();

vi.mock("@vercel/blob", () => ({ del, put, get }));
vi.mock("sharp", () => ({
  default: (...args: unknown[]) => sharp(...args),
}));

const { processUploadedPebblePhoto, deletePebblePhoto, PhotoValidationError } =
  await import("./pebble-photos");

const RAW_URL = "https://blob.example/pebbles-raw/1700000000000-aaaaaaaa-tim-photo.jpg";

function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function rawGetResult(bytes = new Uint8Array([9, 9, 9])) {
  return {
    statusCode: 200,
    stream: streamOf(bytes),
    headers: new Headers(),
    blob: {
      url: RAW_URL,
      downloadUrl: RAW_URL,
      pathname: "pebbles-raw/1700000000000-aaaaaaaa-tim-photo.jpg",
      contentDisposition: "",
      cacheControl: "",
      uploadedAt: new Date(),
      etag: "etag",
      contentType: "image/jpeg",
      size: bytes.byteLength,
    },
  };
}

describe("processUploadedPebblePhoto", () => {
  beforeEach(() => {
    put.mockReset();
    del.mockReset();
    get.mockReset();
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
    get.mockResolvedValue(rawGetResult());
    put.mockResolvedValue({
      url: "https://blob.example/pebbles/photo.webp",
      downloadUrl: "https://blob.example/pebbles/photo.webp?download=1",
    });
    del.mockResolvedValue(undefined);
  });

  it("fetches the raw upload, re-encodes to webp, uploads publicly, and deletes the raw upload", async () => {
    const url = await processUploadedPebblePhoto(RAW_URL);

    expect(get).toHaveBeenCalledWith(RAW_URL, { access: "public" });
    expect(sharp).toHaveBeenCalledTimes(1);
    expect(sharp).toHaveBeenCalledWith(Buffer.from([9, 9, 9]));
    expect(rotate).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledWith({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    });
    expect(webp).toHaveBeenCalledWith({ quality: 80 });
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^pebbles\/\d+-[a-f0-9]{8}-.+\.webp$/),
      Buffer.from("processed"),
      { access: "public", contentType: "image/webp" },
    );
    expect(del).toHaveBeenCalledWith(RAW_URL);
    expect(url).toBe("https://blob.example/pebbles/photo.webp");
  });

  it("falls back to a private fetch when the public fetch fails", async () => {
    get.mockReset();
    get.mockRejectedValueOnce(new Error("not public")).mockResolvedValueOnce(rawGetResult());

    await processUploadedPebblePhoto(RAW_URL);

    expect(get).toHaveBeenNthCalledWith(1, RAW_URL, { access: "public" });
    expect(get).toHaveBeenNthCalledWith(2, RAW_URL, { access: "private" });
  });

  it("throws PhotoValidationError when the raw upload can't be found", async () => {
    get.mockReset();
    get.mockResolvedValue(null);

    await expect(processUploadedPebblePhoto(RAW_URL)).rejects.toBeInstanceOf(
      PhotoValidationError,
    );
    expect(sharp).not.toHaveBeenCalled();
  });

  it("throws PhotoValidationError when sharp cannot process the file", async () => {
    toBuffer.mockRejectedValue(new Error("bad image"));

    await expect(processUploadedPebblePhoto(RAW_URL)).rejects.toEqual(
      expect.objectContaining({
        name: "PhotoValidationError",
        message: "We couldn't process that image. Try a different file.",
      }),
    );
    expect(put).not.toHaveBeenCalled();
  });

  it("falls back to private upload when store rejects public access", async () => {
    put
      .mockRejectedValueOnce(new Error("Vercel Blob: Cannot use public access on a private store."))
      .mockResolvedValueOnce({
        url: "https://blob.example/private/photo.webp",
        downloadUrl: "https://blob.example/private/photo.webp?download=1",
      });

    const url = await processUploadedPebblePhoto(RAW_URL);

    expect(put).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^pebbles\//),
      Buffer.from("processed"),
      { access: "public", contentType: "image/webp" },
    );
    expect(put).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/^pebbles\//),
      Buffer.from("processed"),
      { access: "private", contentType: "image/webp" },
    );
    expect(url).toBe("https://blob.example/private/photo.webp?download=1");
  });

  it("rethrows the original error when the private fallback also fails", async () => {
    const publicError = new Error("network unreachable");
    put.mockRejectedValueOnce(publicError).mockRejectedValueOnce(new Error("private also down"));

    await expect(processUploadedPebblePhoto(RAW_URL)).rejects.toBe(publicError);
    expect(put).toHaveBeenCalledTimes(2);
  });

  it("doesn't fail the whole call when deleting the raw upload fails", async () => {
    del.mockRejectedValueOnce(new Error("already gone"));

    const url = await processUploadedPebblePhoto(RAW_URL);

    expect(url).toBe("https://blob.example/pebbles/photo.webp");
  });
});

describe("deletePebblePhoto", () => {
  it("deletes the blob URL", async () => {
    await deletePebblePhoto("https://blob.example/pebbles/photo.webp");

    expect(del).toHaveBeenCalledWith("https://blob.example/pebbles/photo.webp");
  });
});
