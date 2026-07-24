"use server";

import { auth } from "@/auth";
import { createAccessRequestIfNeeded } from "@/lib/access-requests";

export type RequestAccessState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export async function requestAccessAction(
  _prevState: RequestAccessState,
  _formData: FormData,
): Promise<RequestAccessState> {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return { status: "error", error: "You need to be signed in to request access." };
  }

  await createAccessRequestIfNeeded(email, session.user?.name ?? null);
  return { status: "success" };
}
