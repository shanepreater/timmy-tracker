import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const findFirst = vi.fn();
const create = vi.fn();
const findMany = vi.fn();
const findUniqueOrThrow = vi.fn();
const updateMany = vi.fn();
const upsert = vi.fn();

const mockPrisma = {
  accessRequest: { findFirst, create, findMany, findUniqueOrThrow, updateMany },
  allowedUser: { upsert },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ...mockPrisma,
    $transaction: vi.fn((callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma)),
  },
}));

const {
  createAccessRequestIfNeeded,
  getPendingAccessRequest,
  listPendingAccessRequests,
  approveAccessRequest,
  denyAccessRequest,
} = await import("./access-requests");

beforeEach(() => {
  findFirst.mockReset();
  create.mockReset();
  findMany.mockReset();
  findUniqueOrThrow.mockReset();
  updateMany.mockReset();
  upsert.mockReset();
});

describe("createAccessRequestIfNeeded", () => {
  it("creates a new PENDING request with the normalized email", async () => {
    findFirst.mockResolvedValue(null);
    const created = { id: "r1", email: "shane@example.com", status: "PENDING" };
    create.mockResolvedValue(created);

    await expect(createAccessRequestIfNeeded("Shane@Example.COM", "Shane")).resolves.toEqual(created);

    expect(create).toHaveBeenCalledWith({
      data: { email: "shane@example.com", name: "Shane", status: "PENDING" },
    });
  });

  it("returns the existing PENDING request instead of creating a duplicate", async () => {
    const existing = { id: "r1", email: "shane@example.com", status: "PENDING" };
    findFirst.mockResolvedValue(existing);

    await expect(createAccessRequestIfNeeded("shane@example.com", "Shane")).resolves.toEqual(existing);
    expect(create).not.toHaveBeenCalled();
  });

  it("recovers from a unique-constraint race by re-fetching the winner", async () => {
    findFirst.mockResolvedValueOnce(null);
    const raceError = new Prisma.PrismaClientKnownRequestError("duplicate", {
      code: "P2002",
      clientVersion: "test",
    });
    create.mockRejectedValue(raceError);
    const winner = { id: "r1", email: "shane@example.com", status: "PENDING" };
    findFirst.mockResolvedValueOnce(winner);

    await expect(createAccessRequestIfNeeded("shane@example.com", null)).resolves.toEqual(winner);
  });
});

describe("getPendingAccessRequest / listPendingAccessRequests", () => {
  it("normalizes the email when looking up a pending request", async () => {
    findFirst.mockResolvedValue(null);

    await getPendingAccessRequest("Shane@Example.COM");

    expect(findFirst).toHaveBeenCalledWith({
      where: { email: "shane@example.com", status: "PENDING" },
    });
  });

  it("lists pending requests oldest first", async () => {
    findMany.mockResolvedValue([]);

    await listPendingAccessRequests();

    expect(findMany).toHaveBeenCalledWith({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
    });
  });
});

describe("approveAccessRequest", () => {
  it("conditionally updates on id+PENDING, then creates the AllowedUser row", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({
      id: "r1",
      email: "shane@example.com",
      name: "Shane",
      status: "APPROVED",
    });
    upsert.mockResolvedValue({ id: "u1", email: "shane@example.com" });

    await approveAccessRequest("r1", "Admin@Example.COM");

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "r1", status: "PENDING" },
      data: {
        status: "APPROVED",
        resolvedAt: expect.any(Date),
        resolvedByEmail: "admin@example.com",
      },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { email: "shane@example.com" },
      update: {},
      create: { email: "shane@example.com", name: "Shane" },
    });
  });

  it("throws without touching AllowedUser when the conditional update matches zero rows", async () => {
    // count: 0 means either the row doesn't exist, or (the case this
    // guards against) another admin's update already flipped it away
    // from PENDING between this call reading and writing.
    updateMany.mockResolvedValue({ count: 0 });

    await expect(approveAccessRequest("r1", "admin@example.com")).rejects.toThrow(
      "already been resolved",
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
  });
});

describe("denyAccessRequest", () => {
  it("conditionally updates on id+PENDING with an optional note", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({ id: "r1", status: "DENIED" });

    await denyAccessRequest("r1", "Admin@Example.COM", "not a known contact");

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "r1", status: "PENDING" },
      data: {
        status: "DENIED",
        resolvedAt: expect.any(Date),
        resolvedByEmail: "admin@example.com",
        note: "not a known contact",
      },
    });
  });

  it("throws when the conditional update matches zero rows", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(denyAccessRequest("r1", "admin@example.com")).rejects.toThrow(
      "already been resolved",
    );
  });
});
