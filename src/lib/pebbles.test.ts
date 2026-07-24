import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { pebble: { findMany } },
}));

const { getVerifiedPebbles, formatPebbleDate } = await import("./pebbles");

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
