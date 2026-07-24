import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const create = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { pebble: { findMany, create } },
}));

const { getVerifiedPebbles, submitPebble } = await import("./pebbles");

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
        depositedAt: new Date("2026-03-01"),
        status: "PENDING",
      },
    });
  });
});
