import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const create = vi.fn();
const update = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { pebble: { findMany, create, update } },
}));

const {
  getVerifiedPebbles,
  submitPebble,
  formatPebbleDate,
  listAllPebbles,
  createPebbleByAdmin,
  verifyPebble,
  movePebble,
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
      },
    });
  });

  it("returns whatever Prisma resolves", async () => {
    const pebble = {
      id: "p1",
      latitude: 1,
      longitude: 2,
      depositedBy: "Someone",
      depositedAt: new Date("2026-01-01"),
    };
    findMany.mockResolvedValue([pebble]);

    await expect(getVerifiedPebbles()).resolves.toEqual([pebble]);
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
        submitterEmail: undefined,
        depositedAt: new Date("2026-03-01"),
        status: "PENDING",
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
});

describe("listAllPebbles", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("queries every pebble, pending first then newest-created", async () => {
    findMany.mockResolvedValue([]);

    await listAllPebbles();

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
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
        submitterEmail: null,
        depositedAt: new Date("2026-03-01"),
        status: "VERIFIED",
        verifiedAt: expect.any(Date),
      },
    });
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
