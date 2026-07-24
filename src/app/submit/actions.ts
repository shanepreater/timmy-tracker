"use server";

import { featureFlags } from "@/lib/feature-flags";
import { submitPebble } from "@/lib/pebbles";
import {
  validateSubmitPebbleInput,
  type SubmitPebbleFormErrors,
} from "@/lib/pebble-validation";

export type SubmitPebbleState =
  | { status: "idle" }
  | { status: "error"; errors: SubmitPebbleFormErrors }
  | { status: "success" };

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

  const result = validateSubmitPebbleInput({
    latitude: String(formData.get("latitude") ?? ""),
    longitude: String(formData.get("longitude") ?? ""),
    depositedBy: String(formData.get("depositedBy") ?? ""),
    depositedAt: String(formData.get("depositedAt") ?? ""),
  });

  if (result.errors) {
    return { status: "error", errors: result.errors };
  }

  await submitPebble(result.data);
  return { status: "success" };
}
