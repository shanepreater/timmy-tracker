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
 * Approve and deny both run inside a transaction, and both lead with a
 * conditional updateMany (WHERE id = ... AND status = 'PENDING') rather
 * than a findUnique-then-update. That distinction is the whole point:
 * a findUnique read inside a transaction doesn't stop two concurrent
 * transactions both observing status='PENDING' and both proceeding —
 * whichever commits last wins, silently overwriting the other's
 * resolvedByEmail/status ("last write wins"). A conditional UPDATE
 * doesn't have that gap: Postgres takes a row lock during the UPDATE
 * itself, so a second concurrent UPDATE targeting the same row waits
 * for the first to commit, then re-evaluates its WHERE clause against
 * the now-committed status — finds it's no longer PENDING, and matches
 * zero rows. `count === 0` is how we detect "someone else got there
 * first" and bail out before doing anything else.
 */
export async function approveAccessRequest(
  requestId: string,
  adminEmail: string,
): Promise<AccessRequest> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.accessRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: {
        status: "APPROVED",
        resolvedAt: new Date(),
        resolvedByEmail: normalizeEmail(adminEmail),
      },
    });

    if (count === 0) {
      throw new RequestNotPendingError();
    }

    const request = await tx.accessRequest.findUniqueOrThrow({ where: { id: requestId } });

    await tx.allowedUser.upsert({
      where: { email: request.email },
      update: {},
      create: { email: request.email, name: request.name },
    });

    return request;
  });
}

export async function denyAccessRequest(
  requestId: string,
  adminEmail: string,
  note?: string,
): Promise<AccessRequest> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.accessRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: {
        status: "DENIED",
        resolvedAt: new Date(),
        resolvedByEmail: normalizeEmail(adminEmail),
        note,
      },
    });

    if (count === 0) {
      throw new RequestNotPendingError();
    }

    return tx.accessRequest.findUniqueOrThrow({ where: { id: requestId } });
  });
}
