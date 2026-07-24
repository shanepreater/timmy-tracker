"use client";

import { useActionState } from "react";
import { submitPebbleAction, type SubmitPebbleState } from "@/app/submit/actions";

const initialState: SubmitPebbleState = { status: "idle" };

export function SubmitPebbleForm() {
  const [state, formAction, isPending] = useActionState(submitPebbleAction, initialState);

  if (state.status === "success") {
    return (
      <p role="status" className="text-lg">
        Thank you — your pebble has been submitted and is awaiting review.
      </p>
    );
  }

  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <label className="flex flex-col gap-1">
        Latitude
        <input name="latitude" type="text" inputMode="decimal" required />
        {errors.latitude && <span role="alert">{errors.latitude}</span>}
      </label>

      <label className="flex flex-col gap-1">
        Longitude
        <input name="longitude" type="text" inputMode="decimal" required />
        {errors.longitude && <span role="alert">{errors.longitude}</span>}
      </label>

      <label className="flex flex-col gap-1">
        Deposited by
        <input name="depositedBy" type="text" required />
        {errors.depositedBy && <span role="alert">{errors.depositedBy}</span>}
      </label>

      <label className="flex flex-col gap-1">
        Date deposited
        <input name="depositedAt" type="date" required />
        {errors.depositedAt && <span role="alert">{errors.depositedAt}</span>}
      </label>

      <button type="submit" disabled={isPending}>
        {isPending ? "Submitting…" : "Submit pebble"}
      </button>
    </form>
  );
}
