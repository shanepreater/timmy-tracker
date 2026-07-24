import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const findFirst = vi.fn();
const create = vi.fn();
const findMany = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();
const upsert = vi.fn();

const mockPrisma = {
  accessRequest: { findFirst, create, findMany, findUnique, update },
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
  findUnique.mockReset();
  update.mockReset();
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
  it("creates the AllowedUser row and marks the request APPROVED", async () => {
    findUnique.mockResolvedValue({ id: "r1", email: "shane@example.com", name: "Shane", status: "PENDING" });
    upsert.mockResolvedValue({ id: "u1", email: "shane@example.com" });
    update.mockResolvedValue({ id: "r1", status: "APPROVED" });

    await approveAccessRequest("r1", "Admin@Example.COM");

    expect(upsert).toHaveBeenCalledWith({
      where: { email: "shane@example.com" },
      update: {},
      create: { email: "shane@example.com", name: "Shane" },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: {
        status: "APPROVED",
        resolvedAt: expect.any(Date),
        resolvedByEmail: "admin@example.com",
      },
    });
  });

  it("throws if the request is no longer pending", async () => {
    findUnique.mockResolvedValue({ id: "r1", status: "APPROVED" });

    await expect(approveAccessRequest("r1", "admin@example.com")).rejects.toThrow(
      "already been resolved",
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it("throws if the request doesn't exist", async () => {
    findUnique.mockResolvedValue(null);

    await expect(approveAccessRequest("missing", "admin@example.com")).rejects.toThrow(
      "already been resolved",
    );
  });
});

describe("denyAccessRequest", () => {
  it("marks the request DENIED with an optional note", async () => {
    findUnique.mockResolvedValue({ id: "r1", email: "shane@example.com", status: "PENDING" });
    update.mockResolvedValue({ id: "r1", status: "DENIED" });

    await denyAccessRequest("r1", "Admin@Example.COM", "not a known contact");

    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: {
        status: "DENIED",
        resolvedAt: expect.any(Date),
        resolvedByEmail: "admin@example.com",
        note: "not a known contact",
      },
    });
  });

  it("throws if the request is no longer pending", async () => {
    findUnique.mockResolvedValue({ id: "r1", status: "DENIED" });

    await expect(denyAccessRequest("r1", "admin@example.com")).rejects.toThrow(
      "already been resolved",
    );
  });
});
