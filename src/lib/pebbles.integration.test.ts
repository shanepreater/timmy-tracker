import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getVerifiedPebbles,
  submitPebble,
  listAllPebbles,
  createPebbleByAdmin,
  verifyPebble,
  movePebble,
} from "@/lib/pebbles";

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

  it("records submitterEmail when given", async () => {
    await submitPebble(
      {
        latitude: 10,
        longitude: 20,
        depositedBy: SUBMIT_TEST_MARKER,
        depositedAt: new Date("2026-05-01"),
      },
      "shane@example.com",
    );

    const stored = await prisma.pebble.findFirst({
      where: { depositedBy: SUBMIT_TEST_MARKER },
      orderBy: { createdAt: "desc" },
    });
    expect(stored?.submitterEmail).toBe("shane@example.com");
  });
});

describe("listAllPebbles (integration)", () => {
  const MARKER = "integration-test-list-all";

  beforeAll(async () => {
    await prisma.pebble.deleteMany({ where: { depositedBy: MARKER } });
    await prisma.pebble.createMany({
      data: [
        testPebble("list-all-pending", { depositedBy: MARKER, status: "PENDING" }),
        testPebble("list-all-verified", { depositedBy: MARKER, status: "VERIFIED" }),
      ],
    });
  });

  it("returns both pending and verified pebbles", async () => {
    const result = await listAllPebbles();
    const testResults = result.filter((p) => p.depositedBy === MARKER);

    expect(testResults).toHaveLength(2);
    expect(testResults.map((p) => p.status).sort()).toEqual(["PENDING", "VERIFIED"]);
  });
});

describe("createPebbleByAdmin (integration)", () => {
  const MARKER = "integration-test-admin-create";

  beforeAll(async () => {
    await prisma.pebble.deleteMany({ where: { depositedBy: MARKER } });
  });

  it("creates a pebble already VERIFIED, with no submitterEmail, and it appears on the public map", async () => {
    await createPebbleByAdmin({
      latitude: 10,
      longitude: 20,
      depositedBy: MARKER,
      depositedAt: new Date("2026-05-01"),
    });

    const stored = await prisma.pebble.findFirst({ where: { depositedBy: MARKER } });
    expect(stored).toMatchObject({ status: "VERIFIED", submitterEmail: null });
    expect(stored?.verifiedAt).not.toBeNull();

    const verified = await getVerifiedPebbles();
    expect(verified.some((p) => p.depositedBy === MARKER)).toBe(true);
  });
});

describe("verifyPebble (integration)", () => {
  const MARKER = "integration-test-verify";

  beforeAll(async () => {
    await prisma.pebble.deleteMany({ where: { depositedBy: MARKER } });
    await prisma.pebble.create({
      data: testPebble("verify-target", { depositedBy: MARKER, status: "PENDING" }),
    });
  });

  it("moves a pending pebble to verified and it appears on the public map", async () => {
    const before = await getVerifiedPebbles();
    expect(before.some((p) => p.depositedBy === MARKER)).toBe(false);

    await verifyPebble(`${TEST_ID_PREFIX}verify-target`);

    const stored = await prisma.pebble.findUnique({
      where: { id: `${TEST_ID_PREFIX}verify-target` },
    });
    expect(stored?.status).toBe("VERIFIED");
    expect(stored?.verifiedAt).not.toBeNull();

    const after = await getVerifiedPebbles();
    expect(after.some((p) => p.depositedBy === MARKER)).toBe(true);
  });
});

describe("movePebble (integration)", () => {
  const MARKER = "integration-test-move";

  beforeAll(async () => {
    await prisma.pebble.deleteMany({ where: { depositedBy: MARKER } });
    await prisma.pebble.create({
      data: testPebble("move-target", { depositedBy: MARKER, status: "VERIFIED", latitude: 1, longitude: 1 }),
    });
  });

  it("updates persisted coordinates without touching other fields", async () => {
    await movePebble(`${TEST_ID_PREFIX}move-target`, 33.3, -44.4);

    const stored = await prisma.pebble.findUnique({
      where: { id: `${TEST_ID_PREFIX}move-target` },
    });
    expect(stored).toMatchObject({
      latitude: 33.3,
      longitude: -44.4,
      status: "VERIFIED",
      depositedBy: MARKER,
    });
  });
});
