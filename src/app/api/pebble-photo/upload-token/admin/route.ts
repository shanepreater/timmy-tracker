import { NextResponse } from "next/server";
import { featureFlags } from "@/lib/feature-flags";
import { getDynamicFeatureFlags } from "@/lib/dynamic-feature-flags";
import { requireAdmin } from "@/lib/auth-guards";
import { createPebblePhotoUploadTokenResponse } from "@/lib/pebble-photo-upload-token";

/** Authorizes a raw client-upload the same way addPebbleAction does: always requireAdmin(). */
export async function POST(request: Request): Promise<NextResponse> {
  const { pebblePhotos } = await getDynamicFeatureFlags();
  if (!featureFlags.admin || !pebblePhotos) {
    return NextResponse.json({ error: "Not enabled." }, { status: 403 });
  }

  try {
    const jsonResponse = await createPebblePhotoUploadTokenResponse(request, async () => {
      await requireAdmin();
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
