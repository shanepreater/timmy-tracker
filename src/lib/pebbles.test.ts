import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const create = vi.fn();
const update = vi.fn();
const findUnique = vi.fn();
const deleteOne = vi.fn();

vi.mock("@/lib/pebble-photo-url", () => ({
  toPebblePhotoDisplayUrl: (url: string) => `/api/pebble-photo?url=${encodeURIComponent(url)}`,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { pebble: { findMany, create, update, findUnique, delete: deleteOne } },
}));

const {
  getVerifiedPebbles,
  submitPebble,
  formatPebbleDate,
  listAllPebbles,
  createPebbleByAdmin,
  verifyPebble,
  movePebble,
  getPebblePhotoUrl,
  removePebblePhoto,
  deletePebble,
} = await import("./pebbles");

describe("getVerifiedPebbles", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("queries only verified pebbles, oldest first", async () => {
    findMany.mockResolvedValue([]);

    await getVerifiedPebbles();

    expect(findMany).toHaveBeenCalledWith({
      where: { status: "VERIFIED" },
      orderBy: { depositedAt: "asc" },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        depositedBy: true,
        depositedAt: true,
        photoUrl: true,
        additionalPhotos: { orderBy: { position: "asc" }, select: { url: true } },
      },
    });
  });

  it("returns an empty additionalPhotoUrls when there are none", async () => {
    const pebble = {
      id: "p1",
      latitude: 1,
      longitude: 2,
      depositedBy: "Someone",
      depositedAt: new Date("2026-01-01"),
      photoUrl: null,
      additionalPhotos: [],
    };
    findMany.mockResolvedValue([pebble]);

    await expect(getVerifiedPebbles()).resolves.toEqual([
      {
        id: "p1",
        latitude: 1,
        longitude: 2,
        depositedBy: "Someone",
        depositedAt: new Date("2026-01-01"),
        photoUrl: null,
        additionalPhotoUrls: [],
      },
    ]);
  });

  it("maps non-null photo URLs to app-served display URLs", async () => {
    findMany.mockResolvedValue([
      {
        id: "p1",
        latitude: 1,
        longitude: 2,
        depositedBy: "Someone",
        depositedAt: new Date("2026-01-01"),
        photoUrl: "https://blob.example/photo.webp",
        additionalPhotos: [],
      },
    ]);

    await expect(getVerifiedPebbles()).resolves.toEqual([
      {
        id: "p1",
        latitude: 1,
        longitude: 2,
        depositedBy: "Someone",
        depositedAt: new Date("2026-01-01"),
        photoUrl: "/api/pebble-photo?url=https%3A%2F%2Fblob.example%2Fphoto.webp",
        additionalPhotoUrls: [],
      },
    ]);
  });

  it("maps additional photo URLs to app-served display URLs, in order", async () => {
    findMany.mockResolvedValue([
      {
        id: "p1",
        latitude: 1,
        longitude: 2,
        depositedBy: "Someone",
        depositedAt: new Date("2026-01-01"),
        photoUrl: null,
        additionalPhotos: [
          { url: "https://blob.example/a.webp" },
          { url: "https://blob.example/b.webp" },
        ],
      },
    ]);

    const result = await getVerifiedPebbles();
    expect(result[0]?.additionalPhotoUrls).toEqual([
      "/api/pebble-photo?url=https%3A%2F%2Fblob.example%2Fa.webp",
      "/api/pebble-photo?url=https%3A%2F%2Fblob.example%2Fb.webp",
    ]);
  });
});

describe("submitPebble", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue(undefined);
  });

  it("always creates the pebble as PENDING, regardless of input", async () => {
    await submitPebble({
      latitude: 48.8584,
      longitude: 2.2945,
      depositedBy: "Sarah",
      depositedAt: new Date("2026-03-01"),
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        latitude: 48.8584,
        longitude: 2.2945,
        depositedBy: "Sarah",
        photoUrl: undefined,
        submitterEmail: undefined,
        depositedAt: new Date("2026-03-01"),
        status: "PENDING",
        additionalPhotos: undefined,
      },
    });
  });

  it("records submitterEmail when given, independently of depositedBy", async () => {
    await submitPebble(
      {
        latitude: 48.8584,
        longitude: 2.2945,
        depositedBy: "Sarah (via Google as shane@example.com)",
        depositedAt: new Date("2026-03-01"),
      },
      "shane@example.com",
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ submitterEmail: "shane@example.com" }),
      }),
    );
  });

  it("writes additional photos as a nested create, in order", async () => {
    await submitPebble(
      {
        latitude: 48.8584,
        longitude: 2.2945,
        depositedBy: "Sarah",
        depositedAt: new Date("2026-03-01"),
      },
      undefined,
      undefined,
      ["url-a", "url-b"],
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          additionalPhotos: {
            create: [
              { url: "url-a", position: 0 },
              { url: "url-b", position: 1 },
            ],
          },
        }),
      }),
    );
  });

  it("omits the nested write entirely for an empty additional-photos array", async () => {
    await submitPebble(
      {
        latitude: 48.8584,
        longitude: 2.2945,
        depositedBy: "Sarah",
        depositedAt: new Date("2026-03-01"),
      },
      undefined,
      undefined,
      [],
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ additionalPhotos: undefined }) }),
    );
  });
});

describe("listAllPebbles", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("queries every pebble, pending first then newest-created, including additional photos", async () => {
    findMany.mockResolvedValue([]);

    await listAllPebbles();

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { additionalPhotos: { orderBy: { position: "asc" } } },
    });
  });

  it("maps photo URLs to app-served display URLs", async () => {
    findMany.mockResolvedValue([
      {
        id: "p1",
        latitude: 1,
        longitude: 2,
        depositedBy: "Someone",
        depositedAt: new Date("2026-01-01"),
        status: "VERIFIED",
        photoUrl: "https://blob.example/photo.webp",
        additionalPhotos: [],
      },
    ]);

    const result = await listAllPebbles();
    expect(result[0]?.photoUrl).toBe("/api/pebble-photo?url=https%3A%2F%2Fblob.example%2Fphoto.webp");
  });

  it("maps each additional photo's URL to an app-served display URL, keeping id/position", async () => {
    findMany.mockResolvedValue([
      {
        id: "p1",
        latitude: 1,
        longitude: 2,
        depositedBy: "Someone",
        depositedAt: new Date("2026-01-01"),
        status: "VERIFIED",
        photoUrl: null,
        additionalPhotos: [{ id: "ph1", url: "https://blob.example/a.webp", position: 0 }],
      },
    ]);

    const result = await listAllPebbles();
    expect(result[0]?.additionalPhotos).toEqual([
      { id: "ph1", url: "/api/pebble-photo?url=https%3A%2F%2Fblob.example%2Fa.webp", position: 0 },
    ]);
  });
});

describe("createPebbleByAdmin", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue(undefined);
  });

  it("creates the pebble already VERIFIED with no submitterEmail", async () => {
    await createPebbleByAdmin({
      latitude: 48.8584,
      longitude: 2.2945,
      depositedBy: "Sarah",
      depositedAt: new Date("2026-03-01"),
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        latitude: 48.8584,
        longitude: 2.2945,
        depositedBy: "Sarah",
        photoUrl: null,
        submitterEmail: null,
        depositedAt: new Date("2026-03-01"),
        status: "VERIFIED",
        verifiedAt: expect.any(Date),
        additionalPhotos: undefined,
      },
    });
  });

  it("stores photoUrl when provided", async () => {
    await createPebbleByAdmin(
      {
        latitude: 48.8584,
        longitude: 2.2945,
        depositedBy: "Sarah",
        depositedAt: new Date("2026-03-01"),
      },
      "https://blob.example/photo.webp",
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ photoUrl: "https://blob.example/photo.webp" }),
      }),
    );
  });

  it("writes additional photos as a nested create, in order", async () => {
    await createPebbleByAdmin(
      {
        latitude: 48.8584,
        longitude: 2.2945,
        depositedBy: "Sarah",
        depositedAt: new Date("2026-03-01"),
      },
      "https://blob.example/photo.webp",
      ["url-a", "url-b"],
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          additionalPhotos: {
            create: [
              { url: "url-a", position: 0 },
              { url: "url-b", position: 1 },
            ],
          },
        }),
      }),
    );
  });
});

describe("verifyPebble", () => {
  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue(undefined);
  });

  it("sets status to VERIFIED and stamps verifiedAt", async () => {
    await verifyPebble("p1");

    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "VERIFIED", verifiedAt: expect.any(Date) },
    });
  });
});

describe("movePebble", () => {
  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue(undefined);
  });

  it("updates only the coordinates", async () => {
    await movePebble("p1", 10, 20);

    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { latitude: 10, longitude: 20 },
    });
  });
});

describe("getPebblePhotoUrl", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("returns the photo URL when present", async () => {
    findUnique.mockResolvedValue({ photoUrl: "https://blob.example/photo.webp" });

    await expect(getPebblePhotoUrl("p1")).resolves.toBe("https://blob.example/photo.webp");
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "p1" },
      select: { photoUrl: true },
    });
  });

  it("returns null when no pebble exists", async () => {
    findUnique.mockResolvedValue(null);

    await expect(getPebblePhotoUrl("p1")).resolves.toBeNull();
  });
});

describe("removePebblePhoto", () => {
  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue(undefined);
  });

  it("sets photoUrl to null", async () => {
    await removePebblePhoto("p1");

    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { photoUrl: null },
    });
  });
});

describe("deletePebble", () => {
  beforeEach(() => {
    deleteOne.mockReset();
    deleteOne.mockResolvedValue(undefined);
  });

  it("deletes the pebble by id", async () => {
    await deletePebble("p1");

    expect(deleteOne).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});

describe("formatPebbleDate", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("renders the same calendar date regardless of the viewer's local timezone", () => {
    // "2026-02-01" parses as UTC midnight. A local-time formatter would
    // roll this back to Jan 31 west of UTC, or forward to Feb 2 east of
    // it — formatPebbleDate must show Feb 1 either way.
    const date = new Date("2026-02-01");

    process.env.TZ = "Pacific/Kiritimati"; // UTC+14
    expect(formatPebbleDate(date)).toBe("Feb 1, 2026");

    process.env.TZ = "America/Los_Angeles"; // UTC-8
    expect(formatPebbleDate(date)).toBe("Feb 1, 2026");
  });
});
