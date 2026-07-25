"use client";

import { useActionState } from "react";
import { requestAccessAction, type RequestAccessState } from "@/app/actions/request-access";
import { Button } from "@/components/Button";

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
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending…" : "Request access"}
      </Button>
      {state.status === "error" && (
        <span role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </span>
      )}
    </form>
  );
}
