"use server";

import { featureFlags } from "@/lib/feature-flags";
import { submitPebble } from "@/lib/pebbles";
import { PhotoValidationError, processUploadedPebblePhoto } from "@/lib/pebble-photos";
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

export async function submitPebbleAction(
  _prevState: SubmitPebbleState,
  formData: FormData,
): Promise<SubmitPebbleState> {
  // Defense in depth: the /submit page itself is gated behind this flag
  // too, but the action is a real endpoint regardless of what the UI shows.
  if (!featureFlags.submitPebble) {
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
  if (featureFlags.pebblePhotos) {
    const rawPhotoUrl = getOptionalRawPhotoUrl(formData);
    if (rawPhotoUrl) {
      try {
        photoUrl = await processUploadedPebblePhoto(rawPhotoUrl);
      } catch (error) {
        if (error instanceof PhotoValidationError) {
          return { status: "error", errors: { photo: error.message } };
        }
        throw error;
      }
    }
  }

  await submitPebble(result.data, submitterEmail, photoUrl);
  return { status: "success" };
}
