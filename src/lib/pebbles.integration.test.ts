import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getVerifiedPebbles } from "@/lib/pebbles";

const TEST_ID_PREFIX = "integration-test-pebble-";

function testPebble(suffix: string, overrides: Partial<Parameters<typeof prisma.pebble.create>[0]["data"]>) {
  return {
    id: `${TEST_ID_PREFIX}${suffix}`,
    latitude: 0,
    longitude: 0,
    depositedBy: "Integration test",
    depositedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("getVerifiedPebbles (integration)", () => {
  beforeAll(async () => {
    // Guards against a stale row from a previous crashed run causing a
    // primary-key conflict here instead of a clean, deterministic state.
    await prisma.pebble.deleteMany({
      where: { id: { startsWith: TEST_ID_PREFIX } },
    });

    await prisma.pebble.createMany({
      data: [
        testPebble("older-verified", {
          status: "VERIFIED",
          depositedAt: new Date("2026-01-01"),
        }),
        testPebble("newer-verified", {
          status: "VERIFIED",
          depositedAt: new Date("2026-02-01"),
        }),
        testPebble("pending", { status: "PENDING" }),
      ],
    });
  });

  afterAll(async () => {
    await prisma.pebble.deleteMany({
      where: { id: { startsWith: TEST_ID_PREFIX } },
    });
    await prisma.$disconnect();
  });

  it("returns only verified pebbles, ordered oldest first", async () => {
    const result = await getVerifiedPebbles();
    const testResults = result.filter((p) => p.id.startsWith(TEST_ID_PREFIX));

    expect(testResults.map((p) => p.id)).toEqual([
      `${TEST_ID_PREFIX}older-verified`,
      `${TEST_ID_PREFIX}newer-verified`,
    ]);
  });
});
