import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getVerifiedPebbles, submitPebble } from "@/lib/pebbles";

const TEST_ID_PREFIX = "integration-test-pebble-";
const SUBMIT_TEST_MARKER = "integration-test-submit-pebble";

afterAll(async () => {
  await prisma.$disconnect();
});

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
    // Clean before, not after: this guarantees a known starting state
    // regardless of how the previous run ended (a stale row would
    // otherwise cause a primary-key conflict here instead), and it means
    // a failure/crash leaves its data in place for post-mortem debugging
    // instead of a passing afterAll wiping the evidence.
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

  it("returns only verified pebbles, ordered oldest first", async () => {
    const result = await getVerifiedPebbles();
    const testResults = result.filter((p) => p.id.startsWith(TEST_ID_PREFIX));

    expect(testResults.map((p) => p.id)).toEqual([
      `${TEST_ID_PREFIX}older-verified`,
      `${TEST_ID_PREFIX}newer-verified`,
    ]);
  });
});

describe("submitPebble (integration)", () => {
  beforeAll(async () => {
    await prisma.pebble.deleteMany({
      where: { depositedBy: SUBMIT_TEST_MARKER },
    });
  });

  it("creates a PENDING pebble that doesn't show up as verified", async () => {
    await submitPebble({
      latitude: 10,
      longitude: 20,
      depositedBy: SUBMIT_TEST_MARKER,
      depositedAt: new Date("2026-05-01"),
    });

    const stored = await prisma.pebble.findFirst({
      where: { depositedBy: SUBMIT_TEST_MARKER },
    });
    expect(stored).toMatchObject({
      latitude: 10,
      longitude: 20,
      depositedBy: SUBMIT_TEST_MARKER,
      status: "PENDING",
    });

    const verified = await getVerifiedPebbles();
    expect(verified.some((p) => p.depositedBy === SUBMIT_TEST_MARKER)).toBe(false);
  });
});
