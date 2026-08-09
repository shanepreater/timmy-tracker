import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
const del = vi.fn();

vi.mock("@vercel/blob", () => ({ list, del }));

const { listOrphanedPhotoUploads, deleteOrphanedPhotoUpload, deleteAllOrphanedPhotoUploads } =
  await import("./pebble-photo-orphans");

function blob(overrides: Partial<{ url: string; pathname: string; size: number; uploadedAt: Date }> = {}) {
  return {
    url: overrides.url ?? "https://blob.example/pebbles-raw/old.jpg",
    downloadUrl: overrides.url ?? "https://blob.example/pebbles-raw/old.jpg",
    pathname: overrides.pathname ?? "pebbles-raw/old.jpg",
    size: overrides.size ?? 1024,
    uploadedAt: overrides.uploadedAt ?? new Date("2020-01-01T00:00:00Z"),
    etag: "etag",
  };
}

beforeEach(() => {
  list.mockReset();
  del.mockReset();
  del.mockResolvedValue(undefined);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-10T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listOrphanedPhotoUploads", () => {
  it("lists under the pebbles-raw/ prefix and excludes uploads younger than 1h", async () => {
    list.mockResolvedValue({
      blobs: [
        blob({ pathname: "pebbles-raw/old.jpg", uploadedAt: new Date("2026-08-09T22:00:00Z") }),
        blob({ pathname: "pebbles-raw/recent.jpg", uploadedAt: new Date("2026-08-09T23:30:00Z") }),
      ],
      hasMore: false,
    });

    const orphans = await listOrphanedPhotoUploads();

    expect(list).toHaveBeenCalledWith({ prefix: "pebbles-raw/" });
    expect(orphans).toHaveLength(1);
    expect(orphans[0].pathname).toBe("pebbles-raw/old.jpg");
  });

  it("sorts oldest first", async () => {
    list.mockResolvedValue({
      blobs: [
        blob({ pathname: "pebbles-raw/a.jpg", uploadedAt: new Date("2026-08-01T00:00:00Z") }),
        blob({ pathname: "pebbles-raw/b.jpg", uploadedAt: new Date("2026-07-01T00:00:00Z") }),
      ],
      hasMore: false,
    });

    const orphans = await listOrphanedPhotoUploads();

    expect(orphans.map((o) => o.pathname)).toEqual(["pebbles-raw/b.jpg", "pebbles-raw/a.jpg"]);
  });

  it("returns an empty list when there are no old uploads", async () => {
    list.mockResolvedValue({ blobs: [], hasMore: false });

    expect(await listOrphanedPhotoUploads()).toEqual([]);
  });
});

describe("deleteOrphanedPhotoUpload", () => {
  it("deletes the given URL", async () => {
    await deleteOrphanedPhotoUpload("https://blob.example/pebbles-raw/old.jpg");

    expect(del).toHaveBeenCalledWith("https://blob.example/pebbles-raw/old.jpg");
  });
});

describe("deleteAllOrphanedPhotoUploads", () => {
  it("deletes every orphan and returns the count", async () => {
    list.mockResolvedValue({
      blobs: [
        blob({ url: "https://blob.example/pebbles-raw/a.jpg", uploadedAt: new Date("2026-08-01T00:00:00Z") }),
        blob({ url: "https://blob.example/pebbles-raw/b.jpg", uploadedAt: new Date("2026-08-02T00:00:00Z") }),
      ],
      hasMore: false,
    });

    const count = await deleteAllOrphanedPhotoUploads();

    expect(count).toBe(2);
    expect(del).toHaveBeenCalledWith("https://blob.example/pebbles-raw/a.jpg");
    expect(del).toHaveBeenCalledWith("https://blob.example/pebbles-raw/b.jpg");
  });
});
