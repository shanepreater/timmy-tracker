import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import { featureFlags } from "@/lib/feature-flags";
import { RequestAccess } from "@/components/RequestAccess";
import { AppHeader } from "@/components/AppHeader";
import { SiteHeader } from "@/components/SiteHeader";

type AuthGateProps = {
  children: ReactNode;
};

/**
 * The Node half of the gate (see docs/design-access-control.md): does
 * the whitelist DB lookup that proxy.ts (Edge, no Prisma) can't.
 * proxy.ts's matcher already guarantees a session exists here in
 * practice, but this component doesn't trust that — fails closed
 * (redirects) rather than rendering the app if it somehow finds no
 * session, matching the "Route protection policy" applied everywhere
 * else: never assume a request only ever arrives via the gated path.
 *
 * A header is always present regardless of which branch runs below —
 * see docs/design-ui-redesign.md's "standard header on every page"
 * requirement — with AppHeader (email/admin-link/sign-out) only once
 * there's a resolved, allowlisted session to show those for.
 */
export async function AuthGate({ children }: AuthGateProps) {
  if (!featureFlags.authGate) {
    return (
      <>
        <SiteHeader />
        {children}
      </>
    );
  }

  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect("/api/auth/signin");
  }

  const allowedUser = await prisma.allowedUser.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!allowedUser) {
    return (
      <>
        <SiteHeader />
        <RequestAccess email={email} name={session.user?.name ?? null} />
      </>
    );
  }

  return (
    <>
      <AppHeader email={email} isAdmin={allowedUser.isAdmin} />
      {children}
    </>
  );
}
