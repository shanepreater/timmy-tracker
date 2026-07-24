import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import type { AllowedUser } from "@prisma/client";

export class UnauthorizedError extends Error {
  constructor(message = "Sign in required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Admin access required.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Null if there's no session, or the session's email isn't in
 * AllowedUser — never throws, for callers that want to branch on it
 * (e.g. the root layout deciding whether to show RequestAccess).
 */
export async function getAllowedUser(): Promise<AllowedUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  return prisma.allowedUser.findUnique({
    where: { email: normalizeEmail(email) },
  });
}

/**
 * For every mutating server entrypoint (server action, admin route) —
 * checked independently of the middleware/layout page gate, per
 * docs/design-access-control.md's "Route protection policy". Never
 * trust that a request only ever arrives via the gated UI.
 */
export async function requireAllowedUser(): Promise<AllowedUser> {
  const user = await getAllowedUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin(): Promise<AllowedUser> {
  const user = await requireAllowedUser();
  if (!user.isAdmin) throw new ForbiddenError();
  return user;
}
