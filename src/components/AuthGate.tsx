import type { ReactNode } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import { featureFlags } from "@/lib/feature-flags";
import { RequestAccess } from "@/components/RequestAccess";
import { AppHeader } from "@/components/AppHeader";

type AuthGateProps = {
  children: ReactNode;
};

/**
 * The Node half of the gate (see docs/design-access-control.md): does
 * the whitelist DB lookup that proxy.ts (Edge, no Prisma) can't.
 * Middleware already guarantees a session exists here when the flag is
 * on — the no-session branch below is a defensive fallback, not the
 * primary enforcement.
 */
export async function AuthGate({ children }: AuthGateProps) {
  if (!featureFlags.authGate) {
    return <>{children}</>;
  }

  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return <>{children}</>;
  }

  const allowedUser = await prisma.allowedUser.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!allowedUser) {
    return <RequestAccess email={email} name={session.user?.name ?? null} />;
  }

  return (
    <>
      <AppHeader email={email} isAdmin={allowedUser.isAdmin} />
      {children}
    </>
  );
}
