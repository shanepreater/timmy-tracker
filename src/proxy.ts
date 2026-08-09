import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { featureFlags } from "@/lib/feature-flags";

// The session cookie Auth.js sets is host-only (no `domain` attribute
// configured in src/auth.ts), so a session minted on one host is
// invisible on the other: www.trackingtim.com and trackingtim.com are
// different origins as far as cookies are concerned. Without a
// canonical redirect, a user who happens to land on www after signing
// in on the apex (or vice versa) looks signed out there — this bit an
// admin in production (401s from /api/pebble-photo/upload-token/submit
// that didn't reproduce for whoever's session happened to already
// match the host they were on). Redirecting the non-canonical host
// here, before auth() ever runs, means a session only ever gets minted
// against the canonical host, so the split can't recur.
const CANONICAL_HOST = "trackingtim.com";
const NON_CANONICAL_HOST = `www.${CANONICAL_HOST}`;

/**
 * Edge-safe half of the gate: JWT-only, no DB call (Prisma needs the
 * Node runtime). The whitelist check happens in the root layout
 * instead — see docs/design-access-control.md.
 */
export default auth((req) => {
  if (req.nextUrl.host === NON_CANONICAL_HOST) {
    const canonicalUrl = new URL(req.nextUrl);
    canonicalUrl.host = CANONICAL_HOST;
    // 308: permanent + method-preserving, so a redirected POST (e.g.
    // the upload-token route) stays a POST instead of being coerced to
    // GET the way a 301/302 would.
    return NextResponse.redirect(canonicalUrl, 308);
  }

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
