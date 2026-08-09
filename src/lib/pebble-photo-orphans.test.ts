import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
const del = vi.fn();
const getSetting = vi.fn();
const setSetting = vi.fn();

vi.mock("@vercel/blob", () => ({ list, del }));
vi.mock("@/lib/app-settings", () => ({ getSetting, setSetting }));

const {
  listOrphanedPhotoUploads,
  deleteOrphanedPhotoUpload,
  deleteAllOrphanedPhotoUploads,
  getOrphanMinAgeMinutes,
  setOrphanMinAgeMinutes,
} = await import("./pebble-photo-orphans");

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
  getSetting.mockReset();
  setSetting.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-10T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listOrphanedPhotoUploads", () => {
  it("lists under the pebbles-raw/ prefix and excludes uploads younger than the given threshold", async () => {
    list.mockResolvedValue({
      blobs: [
        blob({ pathname: "pebbles-raw/old.jpg", uploadedAt: new Date("2026-08-09T22:00:00Z") }),
        blob({ pathname: "pebbles-raw/recent.jpg", uploadedAt: new Date("2026-08-09T23:30:00Z") }),
      ],
      hasMore: false,
    });

    const orphans = await listOrphanedPhotoUploads(60);

    expect(list).toHaveBeenCalledWith({ prefix: "pebbles-raw/" });
    expect(orphans).toHaveLength(1);
    expect(orphans[0].pathname).toBe("pebbles-raw/old.jpg");
  });

  it("respects a 0-minute threshold (show everything already uploaded)", async () => {
    list.mockResolvedValue({
      blobs: [blob({ pathname: "pebbles-raw/recent.jpg", uploadedAt: new Date("2026-08-09T23:59:59Z") })],
      hasMore: false,
    });

    const orphans = await listOrphanedPhotoUploads(0);

    expect(orphans).toHaveLength(1);
  });

  it("sorts oldest first", async () => {
    list.mockResolvedValue({
      blobs: [
        blob({ pathname: "pebbles-raw/a.jpg", uploadedAt: new Date("2026-08-01T00:00:00Z") }),
        blob({ pathname: "pebbles-raw/b.jpg", uploadedAt: new Date("2026-07-01T00:00:00Z") }),
      ],
      hasMore: false,
    });

    const orphans = await listOrphanedPhotoUploads(60);

    expect(orphans.map((o) => o.pathname)).toEqual(["pebbles-raw/b.jpg", "pebbles-raw/a.jpg"]);
  });

  it("returns an empty list when there are no old uploads", async () => {
    list.mockResolvedValue({ blobs: [], hasMore: false });

    expect(await listOrphanedPhotoUploads(60)).toEqual([]);
  });
});

describe("deleteOrphanedPhotoUpload", () => {
  it("deletes the given URL", async () => {
    await deleteOrphanedPhotoUpload("https://blob.example/pebbles-raw/old.jpg");

    expect(del).toHaveBeenCalledWith("https://blob.example/pebbles-raw/old.jpg");
  });
});

describe("deleteAllOrphanedPhotoUploads", () => {
  it("deletes every orphan at the given threshold and returns the count", async () => {
    list.mockResolvedValue({
      blobs: [
        blob({ url: "https://blob.example/pebbles-raw/a.jpg", uploadedAt: new Date("2026-08-01T00:00:00Z") }),
        blob({ url: "https://blob.example/pebbles-raw/b.jpg", uploadedAt: new Date("2026-08-02T00:00:00Z") }),
      ],
      hasMore: false,
    });

    const count = await deleteAllOrphanedPhotoUploads(60);

    expect(count).toBe(2);
    expect(del).toHaveBeenCalledWith("https://blob.example/pebbles-raw/a.jpg");
    expect(del).toHaveBeenCalledWith("https://blob.example/pebbles-raw/b.jpg");
  });
});

describe("getOrphanMinAgeMinutes", () => {
  it("reads the persisted AppSetting", async () => {
    getSetting.mockResolvedValue("15");

    expect(await getOrphanMinAgeMinutes()).toBe(15);
    expect(getSetting).toHaveBeenCalledWith("ORPHANED_IMAGE_DELAY_MINS");
  });

  it("fails open (0 = show everything) when the setting is missing", async () => {
    getSetting.mockResolvedValue(null);

    expect(await getOrphanMinAgeMinutes()).toBe(0);
  });

  it("fails open when the setting is corrupt/non-numeric", async () => {
    getSetting.mockResolvedValue("not-a-number");

    expect(await getOrphanMinAgeMinutes()).toBe(0);
  });

  it("fails open when the setting is negative", async () => {
    getSetting.mockResolvedValue("-5");

    expect(await getOrphanMinAgeMinutes()).toBe(0);
  });
});

describe("setOrphanMinAgeMinutes", () => {
  it("persists a non-negative integer", async () => {
    await setOrphanMinAgeMinutes(30);

    expect(setSetting).toHaveBeenCalledWith("ORPHANED_IMAGE_DELAY_MINS", "30");
  });

  it("floors a fractional value", async () => {
    await setOrphanMinAgeMinutes(30.9);

    expect(setSetting).toHaveBeenCalledWith("ORPHANED_IMAGE_DELAY_MINS", "30");
  });

  it("rejects a negative value", async () => {
    await expect(setOrphanMinAgeMinutes(-1)).rejects.toThrow(
      "minAgeMinutes must be a non-negative number.",
    );
    expect(setSetting).not.toHaveBeenCalled();
  });
});
