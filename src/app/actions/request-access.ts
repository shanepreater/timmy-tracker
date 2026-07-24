"use server";

import { auth } from "@/auth";
import { createAccessRequestIfNeeded } from "@/lib/access-requests";
import { getAllowedUser } from "@/lib/auth-guards";
import { featureFlags } from "@/lib/feature-flags";

export type RequestAccessState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export async function requestAccessAction(
  _prevState: RequestAccessState,
  _formData: FormData,
): Promise<RequestAccessState> {
  // Server actions are callable independently of whatever UI led here —
  // this isn't reachable through the app while the gate itself is off,
  // but the action endpoint still exists regardless.
  if (!featureFlags.authGate) {
    return { status: "error", error: "Access requests aren't open." };
  }

  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return { status: "error", error: "You need to be signed in to request access." };
  }

  // Already-allowed users hitting this (e.g. a stale page, or calling
  // the action directly) shouldn't create a confusing pending request
  // for an account that already has access.
  if (await getAllowedUser()) {
    return { status: "error", error: "This account already has access." };
  }

  await createAccessRequestIfNeeded(email, session.user?.name ?? null);
  return { status: "success" };
}
