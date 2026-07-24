import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { pebble: { findMany } },
}));

const { getVerifiedPebbles } = await import("./pebbles");

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
