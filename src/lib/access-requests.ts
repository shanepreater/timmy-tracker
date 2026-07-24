import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import type { AccessRequest } from "@prisma/client";

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Idempotent: if a PENDING request already exists for this email, returns
 * it instead of creating a duplicate. The app-level check-then-create here
 * is a fast path only — the partial unique index (see the access_control
 * migration) is what actually closes the race two concurrent requests
 * could otherwise win.
 */
export async function createAccessRequestIfNeeded(
  email: string,
  name: string | null,
): Promise<AccessRequest> {
  const normalized = normalizeEmail(email);

  const existing = await prisma.accessRequest.findFirst({
    where: { email: normalized, status: "PENDING" },
  });
  if (existing) return existing;

  try {
    return await prisma.accessRequest.create({
      data: { email: normalized, name, status: "PENDING" },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const request = await prisma.accessRequest.findFirst({
        where: { email: normalized, status: "PENDING" },
      });
      if (request) return request;
    }
    throw error;
  }
}

export async function getPendingAccessRequest(email: string): Promise<AccessRequest | null> {
  return prisma.accessRequest.findFirst({
    where: { email: normalizeEmail(email), status: "PENDING" },
  });
}

export async function listPendingAccessRequests(): Promise<AccessRequest[]> {
  return prisma.accessRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { requestedAt: "asc" },
  });
}

class RequestNotPendingError extends Error {
  constructor() {
    super("This request has already been resolved.");
    this.name = "RequestNotPendingError";
  }
}

/**
 * Approve and deny both run inside a transaction: re-check the request
 * is still PENDING immediately before mutating it, so two admins acting
 * on the same request at the same moment can't both succeed.
 */
export async function approveAccessRequest(
  requestId: string,
  adminEmail: string,
): Promise<AccessRequest> {
  return prisma.$transaction(async (tx) => {
    const request = await tx.accessRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== "PENDING") {
      throw new RequestNotPendingError();
    }

    await tx.allowedUser.upsert({
      where: { email: request.email },
      update: {},
      create: { email: request.email, name: request.name },
    });

    return tx.accessRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        resolvedAt: new Date(),
        resolvedByEmail: normalizeEmail(adminEmail),
      },
    });
  });
}

export async function denyAccessRequest(
  requestId: string,
  adminEmail: string,
  note?: string,
): Promise<AccessRequest> {
  return prisma.$transaction(async (tx) => {
    const request = await tx.accessRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== "PENDING") {
      throw new RequestNotPendingError();
    }

    return tx.accessRequest.update({
      where: { id: requestId },
      data: {
        status: "DENIED",
        resolvedAt: new Date(),
        resolvedByEmail: normalizeEmail(adminEmail),
        note,
      },
    });
  });
}
