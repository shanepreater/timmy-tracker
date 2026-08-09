import { NextResponse } from "next/server";
import { featureFlags } from "@/lib/feature-flags";
import { getDynamicFeatureFlags } from "@/lib/dynamic-feature-flags";
import { requireAllowedUser, UnauthorizedError } from "@/lib/auth-guards";
import { createPebblePhotoUploadTokenResponse } from "@/lib/pebble-photo-upload-token";

/**
 * Authorizes a raw client-upload the same way submitPebbleAction does:
 * only requires the whitelist while the auth gate itself is on — see
 * that action's comment for why (submissions stay fully public when
 * the gate is off, same as the rest of the site).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { pebblePhotos, submitPebble } = await getDynamicFeatureFlags();
  if (!pebblePhotos || !submitPebble) {
    return NextResponse.json({ error: "Photo uploads aren't enabled." }, { status: 403 });
  }

  try {
    const jsonResponse = await createPebblePhotoUploadTokenResponse(request, async () => {
      if (!featureFlags.authGate) return;

      try {
        await requireAllowedUser();
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          throw new Error("Sign in required to submit a pebble.");
        }
        throw error;
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
