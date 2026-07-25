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

// The matcher must be a static string literal inlined directly here —
// Next.js statically parses this at build time and rejects a reference
// to an external constant ("Entry matcher[0] need to be static strings
// or static objects"), so proxy.test.ts derives its own copy of this
// pattern rather than importing it.
//
// Static assets (the header logo, favicon, anything else dropped in
// public/) must stay reachable regardless of the gate — otherwise an
// unauthenticated request for /tim.jpg itself redirects to sign-in,
// and so does Next's Image Optimization endpoint's *internal* fetch of
// it, which breaks the logo everywhere it's used (found by manually
// hitting /tim.jpg locally with FEATURE_AUTH_GATE=true).
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
