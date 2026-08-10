import { beforeEach, describe, expect, it, vi } from "vitest";

const getSetting = vi.fn();
const setSetting = vi.fn();
const findMany = vi.fn();
const count = vi.fn();
const createMany = vi.fn();
const findUnique = vi.fn();
const deleteOne = vi.fn();

vi.mock("@/lib/app-settings", () => ({ getSetting, setSetting }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pebbleAdditionalPhoto: { findMany, count, createMany, findUnique, delete: deleteOne },
  },
}));

const {
  DEFAULT_MAX_ADDITIONAL_PHOTOS,
  getMaxAdditionalPhotos,
  setMaxAdditionalPhotos,
  listAdditionalPhotos,
  addAdditionalPhotos,
  getAdditionalPhotoUrl,
  deleteAdditionalPhotoRow,
} = await import("./pebble-additional-photos");

beforeEach(() => {
  getSetting.mockReset();
  setSetting.mockReset();
  findMany.mockReset();
  count.mockReset();
  createMany.mockReset();
  findUnique.mockReset();
  deleteOne.mockReset();
});

describe("getMaxAdditionalPhotos", () => {
  it("reads the persisted AppSetting", async () => {
    getSetting.mockResolvedValue("7");

    expect(await getMaxAdditionalPhotos()).toBe(7);
    expect(getSetting).toHaveBeenCalledWith("MAX_ADDITIONAL_PEBBLE_PHOTOS");
  });

  it("falls back to the default when the setting is missing", async () => {
    getSetting.mockResolvedValue(null);

    expect(await getMaxAdditionalPhotos()).toBe(DEFAULT_MAX_ADDITIONAL_PHOTOS);
  });

  it("falls back to the default when the setting is corrupt/non-numeric", async () => {
    getSetting.mockResolvedValue("not-a-number");

    expect(await getMaxAdditionalPhotos()).toBe(DEFAULT_MAX_ADDITIONAL_PHOTOS);
  });

  it("falls back to the default when the setting is negative", async () => {
    getSetting.mockResolvedValue("-2");

    expect(await getMaxAdditionalPhotos()).toBe(DEFAULT_MAX_ADDITIONAL_PHOTOS);
  });

  it("falls back to the default when the setting isn't an integer", async () => {
    getSetting.mockResolvedValue("2.5");

    expect(await getMaxAdditionalPhotos()).toBe(DEFAULT_MAX_ADDITIONAL_PHOTOS);
  });

  it("accepts zero", async () => {
    getSetting.mockResolvedValue("0");

    expect(await getMaxAdditionalPhotos()).toBe(0);
  });
});

describe("setMaxAdditionalPhotos", () => {
  it("persists a non-negative integer", async () => {
    await setMaxAdditionalPhotos(3);

    expect(setSetting).toHaveBeenCalledWith("MAX_ADDITIONAL_PEBBLE_PHOTOS", "3");
  });

  it("floors a fractional value", async () => {
    await setMaxAdditionalPhotos(3.9);

    expect(setSetting).toHaveBeenCalledWith("MAX_ADDITIONAL_PEBBLE_PHOTOS", "3");
  });

  it("rejects a negative value", async () => {
    await expect(setMaxAdditionalPhotos(-1)).rejects.toThrow(
      "count must be a non-negative number.",
    );
    expect(setSetting).not.toHaveBeenCalled();
  });
});

describe("listAdditionalPhotos", () => {
  it("queries by pebbleId, ordered by position", async () => {
    findMany.mockResolvedValue([]);

    await listAdditionalPhotos("pebble-1");

    expect(findMany).toHaveBeenCalledWith({
      where: { pebbleId: "pebble-1" },
      orderBy: { position: "asc" },
      select: { id: true, url: true, position: true },
    });
  });
});

describe("addAdditionalPhotos", () => {
  it("appends urls after the existing count, in order", async () => {
    count.mockResolvedValue(2);

    await addAdditionalPhotos("pebble-1", ["url-a", "url-b"]);

    expect(createMany).toHaveBeenCalledWith({
      data: [
        { pebbleId: "pebble-1", url: "url-a", position: 2 },
        { pebbleId: "pebble-1", url: "url-b", position: 3 },
      ],
    });
  });

  it("does nothing for an empty list", async () => {
    await addAdditionalPhotos("pebble-1", []);

    expect(count).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });
});

describe("getAdditionalPhotoUrl", () => {
  it("returns the url for an existing row", async () => {
    findUnique.mockResolvedValue({ url: "https://blob.example/pebbles/a.webp" });

    expect(await getAdditionalPhotoUrl("photo-1")).toBe("https://blob.example/pebbles/a.webp");
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "photo-1" }, select: { url: true } });
  });

  it("returns null when the row doesn't exist", async () => {
    findUnique.mockResolvedValue(null);

    expect(await getAdditionalPhotoUrl("missing")).toBeNull();
  });
});

describe("deleteAdditionalPhotoRow", () => {
  it("deletes by id", async () => {
    await deleteAdditionalPhotoRow("photo-1");

    expect(deleteOne).toHaveBeenCalledWith({ where: { id: "photo-1" } });
  });
});
