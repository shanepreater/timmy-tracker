import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { featureFlags } from "@/lib/feature-flags";

/**
 * Edge-safe half of the gate: JWT-only, no DB call (Prisma needs the
 * Node runtime). The whitelist check happens in the root layout
 * instead — see docs/design-access-control.md.
 */
export default auth((req) => {
  if (!featureFlags.authGate) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
