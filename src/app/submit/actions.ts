"use server";

import { featureFlags } from "@/lib/feature-flags";
import { getDynamicFeatureFlags } from "@/lib/dynamic-feature-flags";
import { submitPebble } from "@/lib/pebbles";
import {
  PhotoValidationError,
  processUploadedPebblePhoto,
  processUploadedPebblePhotos,
} from "@/lib/pebble-photos";
import { getMaxAdditionalPhotos } from "@/lib/pebble-additional-photos";
import { requireAllowedUser, UnauthorizedError } from "@/lib/auth-guards";
import {
  validateSubmitPebbleInput,
  type SubmitPebbleFormErrors,
} from "@/lib/pebble-validation";

export type SubmitPebbleState =
  | { status: "idle" }
  | { status: "error"; errors: SubmitPebbleFormErrors }
  | { status: "success" };

/**
 * The photo itself was already uploaded straight to Blob by
 * PebblePhotoField before this action ever ran — this reads the
 * resulting raw URL, not a File. See pebble-photos.ts's module
 * comment for why (Vercel Functions cap Server Action request bodies
 * at 4.5 MB, well under the 8 MB photo limit).
 */
function getOptionalRawPhotoUrl(formData: FormData): string | null {
  const value = formData.get("rawPhotoUrl");
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Same idea as getOptionalRawPhotoUrl, but for the multi-value additional-photos field. */
function getRawAdditionalPhotoUrls(formData: FormData): string[] {
  return formData
    .getAll("additionalPhotoUrls")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

export async function submitPebbleAction(
  _prevState: SubmitPebbleState,
  formData: FormData,
): Promise<SubmitPebbleState> {
  // Defense in depth: the /submit page itself is gated behind this flag
  // too, but the action is a real endpoint regardless of what the UI shows.
  const dynamicFlags = await getDynamicFeatureFlags();
  if (!dynamicFlags.submitPebble) {
    return {
      status: "error",
      errors: { depositedBy: "Submissions aren't open yet." },
    };
  }

  // Independently enforces the site-wide whitelist policy (see
  // docs/design-access-control.md's "Route protection policy") rather
  // than trusting that /submit was reached through the gated UI. Only
  // applies while the gate itself is on — with it off, submissions stay
  // fully public, matching the rest of the (ungated) site.
  let submitterEmail: string | undefined;
  if (featureFlags.authGate) {
    try {
      const user = await requireAllowedUser();
      submitterEmail = user.email;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return {
          status: "error",
          errors: { depositedBy: "Sign in required to submit a pebble." },
        };
      }
      throw error;
    }
  }

  const result = validateSubmitPebbleInput({
    latitude: String(formData.get("latitude") ?? ""),
    longitude: String(formData.get("longitude") ?? ""),
    depositedBy: String(formData.get("depositedBy") ?? ""),
    depositedAt: String(formData.get("depositedAt") ?? ""),
  });

  if (result.errors) {
    return { status: "error", errors: result.errors };
  }

  let photoUrl: string | undefined;
  let additionalPhotoUrls: string[] | undefined;
  if (dynamicFlags.pebblePhotos) {
    const rawPhotoUrl = getOptionalRawPhotoUrl(formData);
    const rawAdditionalPhotoUrls = getRawAdditionalPhotoUrls(formData);

    const maxAdditionalPhotos = await getMaxAdditionalPhotos();
    if (rawAdditionalPhotoUrls.length > maxAdditionalPhotos) {
      return {
        status: "error",
        errors: { photo: `You can add at most ${maxAdditionalPhotos} additional photos.` },
      };
    }

    try {
      if (rawPhotoUrl) {
        photoUrl = await processUploadedPebblePhoto(rawPhotoUrl);
      }
      if (rawAdditionalPhotoUrls.length > 0) {
        additionalPhotoUrls = await processUploadedPebblePhotos(rawAdditionalPhotoUrls);
      }
    } catch (error) {
      if (error instanceof PhotoValidationError) {
        return { status: "error", errors: { photo: error.message } };
      }
      throw error;
    }
  }

  await submitPebble(result.data, submitterEmail, photoUrl, additionalPhotoUrls);
  return { status: "success" };
}
