import { NextResponse } from "next/server";
import { getDynamicFeatureFlags } from "@/lib/dynamic-feature-flags";

/**
 * Public, unauthenticated by necessity: an anonymous visitor landing
 * on "/" needs to know whether the map is on before/without signing
 * in (FEATURE_AUTH_GATE may be off), so this can't sit behind the same
 * gate it helps decide whether to show. Moving these flags off
 * NEXT_PUBLIC_* env vars stops them being baked into the JS bundle and
 * makes them admin-toggleable without a redeploy — it does not make
 * them secret; anyone can still read this response directly.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const flags = await getDynamicFeatureFlags();
  return NextResponse.json(flags);
}
