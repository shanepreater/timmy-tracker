"use server";

import { featureFlags } from "@/lib/feature-flags";
import { submitPebble } from "@/lib/pebbles";
import { uploadPebblePhoto, validatePebblePhoto } from "@/lib/pebble-photos";
import { requireAllowedUser, UnauthorizedError } from "@/lib/auth-guards";
import {
  validateSubmitPebbleInput,
  type SubmitPebbleFormErrors,
} from "@/lib/pebble-validation";

export type SubmitPebbleState =
  | { status: "idle" }
  | { status: "error"; errors: SubmitPebbleFormErrors }
  | { status: "success" };

function getOptionalPhoto(formData: FormData): File | null {
  const value = formData.get("photo");
  if (!(value instanceof File)) {
    return null;
  }

  // Browser file inputs include an empty File when left untouched.
  if (!value.name || value.size === 0) {
    return null;
  }

  return value;
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
    const photo = getOptionalPhoto(formData);
    if (photo) {
      const validation = validatePebblePhoto(photo);
      if (validation.error) {
        return { status: "error", errors: { photo: validation.error } };
      }

      photoUrl = await uploadPebblePhoto(photo);
    }
  }

  await submitPebble(result.data, submitterEmail, photoUrl);
  return { status: "success" };
}
