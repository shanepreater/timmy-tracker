import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  approveAccessRequest,
  createAccessRequestIfNeeded,
  denyAccessRequest,
} from "@/lib/access-requests";

const TEST_EMAIL_MARKER = "integration-test-access-request@example.com";

afterAll(async () => {
  await prisma.$disconnect();
});

beforeAll(async () => {
  await prisma.accessRequest.deleteMany({ where: { email: { contains: TEST_EMAIL_MARKER } } });
  await prisma.allowedUser.deleteMany({ where: { email: { contains: TEST_EMAIL_MARKER } } });
});

describe("createAccessRequestIfNeeded (integration)", () => {
  it("really does prevent two pending requests for the same email at the DB level", async () => {
    const [first, second] = await Promise.all([
      createAccessRequestIfNeeded(TEST_EMAIL_MARKER, "First"),
      createAccessRequestIfNeeded(TEST_EMAIL_MARKER, "Second"),
    ]);

    // Both calls resolve to the *same* row, whichever won the race —
    // this is the partial unique index doing its job, not just the
    // app-level pre-check (which can't see the other call in flight).
    expect(first.id).toBe(second.id);

    const rows = await prisma.accessRequest.findMany({
      where: { email: TEST_EMAIL_MARKER, status: "PENDING" },
    });
    expect(rows).toHaveLength(1);
  });
});

describe("approveAccessRequest (integration)", () => {
  it("creates a real AllowedUser row and marks the request APPROVED", async () => {
    const request = await createAccessRequestIfNeeded(
      `approve-${TEST_EMAIL_MARKER}`,
      "Approve Me",
    );

    await approveAccessRequest(request.id, "admin@example.com");

    const allowedUser = await prisma.allowedUser.findUnique({
      where: { email: `approve-${TEST_EMAIL_MARKER}` },
    });
    expect(allowedUser).not.toBeNull();

    const updated = await prisma.accessRequest.findUnique({ where: { id: request.id } });
    expect(updated?.status).toBe("APPROVED");
    expect(updated?.resolvedByEmail).toBe("admin@example.com");

    await prisma.allowedUser.deleteMany({ where: { email: `approve-${TEST_EMAIL_MARKER}` } });
    await prisma.accessRequest.deleteMany({ where: { email: `approve-${TEST_EMAIL_MARKER}` } });
  });

  it("rejects approving a request that's already been resolved", async () => {
    const request = await createAccessRequestIfNeeded(`deny-${TEST_EMAIL_MARKER}`, "Deny Me");
    await denyAccessRequest(request.id, "admin@example.com", "not recognized");

    await expect(approveAccessRequest(request.id, "admin@example.com")).rejects.toThrow(
      "already been resolved",
    );

    const allowedUser = await prisma.allowedUser.findUnique({
      where: { email: `deny-${TEST_EMAIL_MARKER}` },
    });
    expect(allowedUser).toBeNull();

    await prisma.accessRequest.deleteMany({ where: { email: `deny-${TEST_EMAIL_MARKER}` } });
  });
});
