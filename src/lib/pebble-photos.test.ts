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

const { processUploadedPebblePhoto, processUploadedPebblePhotos, deletePebblePhoto, PhotoValidationError } =
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

  it("copies sharp's output into a plain buffer before uploading, not just a new object over the same shared memory", async () => {
    // Regression test: sharp's native bindings can hand back a Buffer
    // view over a SharedArrayBuffer (its worker-thread pool transfers
    // memory this way). fetch() rejects a SharedArrayBuffer-backed
    // body outright ("TypeError: ArrayBuffer: SharedArrayBuffer is not
    // allowed") — reproduced in production (Vercel's runtime), not
    // local `next dev`. Mocking sharp's output with a Buffer actually
    // backed by a SharedArrayBuffer (not just any Buffer) and
    // asserting on the *backing store*, not object identity: a new
    // Buffer object created as a view over the same SharedArrayBuffer
    // (e.g. via .subarray()) would pass a same-content/different-
    // reference check while still carrying the exact bug forward.
    const sharedBacking = new SharedArrayBuffer(9);
    const sharpOutput = Buffer.from(sharedBacking);
    sharpOutput.write("processed");
    toBuffer.mockResolvedValue(sharpOutput);

    await processUploadedPebblePhoto(RAW_URL);

    const uploadedBuffer = put.mock.calls[0][1] as Buffer;
    expect(uploadedBuffer.toString()).toBe("processed");
    expect(uploadedBuffer.buffer).not.toBeInstanceOf(SharedArrayBuffer);
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

describe("processUploadedPebblePhotos", () => {
  const RAW_URL_A = "https://blob.example/pebbles-raw/a.jpg";
  const RAW_URL_B = "https://blob.example/pebbles-raw/b.jpg";

  beforeEach(() => {
    put.mockReset();
    del.mockReset();
    get.mockReset();
    sharp.mockReset();
    del.mockResolvedValue(undefined);
    get.mockImplementation((url: string) => Promise.resolve(rawGetResult(new TextEncoder().encode(url))));
    put.mockImplementation((path: string) =>
      Promise.resolve({ url: `https://blob.example/${path}`, downloadUrl: `https://blob.example/${path}` }),
    );
  });

  it("processes every url concurrently and returns each processed url", async () => {
    sharp.mockImplementation(() => ({
      rotate: () => ({
        resize: () => ({ webp: () => ({ toBuffer: () => Promise.resolve(Buffer.from("processed")) }) }),
      }),
    }));

    const urls = await processUploadedPebblePhotos([RAW_URL_A, RAW_URL_B]);

    expect(urls).toHaveLength(2);
    expect(urls.every((url) => url.startsWith("https://blob.example/pebbles/"))).toBe(true);
    // Both raw intermediates cleaned up.
    expect(del).toHaveBeenCalledWith(RAW_URL_A);
    expect(del).toHaveBeenCalledWith(RAW_URL_B);
  });

  it("returns an empty array for an empty batch, without touching Blob", async () => {
    expect(await processUploadedPebblePhotos([])).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it("cleans up the processed blobs from urls that already succeeded when one url in the batch fails, then rethrows", async () => {
    // sharp's buffer is exactly the raw bytes fetched for that url (see the
    // get mock above), so branching on its content identifies which url is
    // mid-flight without relying on any assumption about call ordering
    // across the concurrently-running processUploadedPebblePhoto calls.
    sharp.mockImplementation((buffer: Buffer) => ({
      rotate: () => ({
        resize: () => ({
          webp: () => ({
            toBuffer: () =>
              buffer.toString() === RAW_URL_B
                ? Promise.reject(new Error("bad image"))
                : Promise.resolve(Buffer.from("processed")),
          }),
        }),
      }),
    }));

    await expect(processUploadedPebblePhotos([RAW_URL_A, RAW_URL_B])).rejects.toThrow(
      "We couldn't process that image. Try a different file.",
    );

    // A succeeded and got its raw intermediate cleaned up as usual...
    expect(del).toHaveBeenCalledWith(RAW_URL_A);
    // ...but since the batch as a whole failed, A's already-processed blob
    // is also deleted rather than left behind as an orphan.
    expect(del).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/blob\.example\/pebbles\//));
    // B never got far enough to attempt its own raw cleanup.
    expect(del).not.toHaveBeenCalledWith(RAW_URL_B);
  });
});

describe("deletePebblePhoto", () => {
  it("deletes the blob URL", async () => {
    await deletePebblePhoto("https://blob.example/pebbles/photo.webp");

    expect(del).toHaveBeenCalledWith("https://blob.example/pebbles/photo.webp");
  });
});
