"use client";

import { useActionState } from "react";
import { requestAccessAction, type RequestAccessState } from "@/app/actions/request-access";

const initialState: RequestAccessState = { status: "idle" };

export function RequestAccessButton() {
  const [state, formAction, isPending] = useActionState(requestAccessAction, initialState);

  if (state.status === "success") {
    return (
      <p role="status">Request sent — we&apos;ll let you know once you&apos;re approved.</p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-center gap-2">
      <button type="submit" disabled={isPending}>
        {isPending ? "Sending…" : "Request access"}
      </button>
      {state.status === "error" && <span role="alert">{state.error}</span>}
    </form>
  );
}
