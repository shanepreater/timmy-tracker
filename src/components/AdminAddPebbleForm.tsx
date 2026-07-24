"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { addPebbleAction, type AddPebbleState } from "@/app/admin/actions";
import { PlaceLookup, type ResolvedPlace } from "@/components/PlaceLookup";

const initialState: AddPebbleState = { status: "idle" };

/**
 * Admin-only equivalent of SubmitPebbleForm: same fields and place-lookup
 * behavior, but creates the pebble already VERIFIED (see
 * docs/design-admin-pebbles.md), and stays on the form after success —
 * an admin adding pebbles is likely to add several in a row.
 */
export function AdminAddPebbleForm() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [state, formAction, isPending] = useActionState(addPebbleAction, initialState);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the form after a successful add — an admin adding pebbles is
  // likely to add several in a row. Cleared during render, guarded by
  // comparing against the last-seen state (React's "adjusting state"
  // pattern: https://react.dev/learn/you-might-not-need-an-effect),
  // rather than in an effect that would setState after the DOM commits.
  const [handledState, setHandledState] = useState(state);
  if (handledState !== state) {
    setHandledState(state);
    if (state.status === "success") {
      setLatitude("");
      setLongitude("");
      setResolvedAddress(null);
    }
  }

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  const errors = state.status === "error" ? state.errors : {};

  function handleResolved(place: ResolvedPlace) {
    setLatitude(String(place.latitude));
    setLongitude(String(place.longitude));
    setResolvedAddress(place.formattedAddress);
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 max-w-md">
      <h3 className="text-lg font-semibold">Add a pebble</h3>

      {state.status === "success" && (
        <p role="status">Pebble added and verified.</p>
      )}

      {apiKey && (
        <APIProvider apiKey={apiKey}>
          <PlaceLookup onResolved={handleResolved} />
        </APIProvider>
      )}

      {resolvedAddress && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Resolved to: {resolvedAddress}
        </p>
      )}

      <label className="flex flex-col gap-1">
        Latitude
        <input
          name="latitude"
          type="text"
          inputMode="decimal"
          required
          value={latitude}
          onChange={(event) => {
            setLatitude(event.target.value);
            setResolvedAddress(null);
          }}
        />
        {errors.latitude && <span role="alert">{errors.latitude}</span>}
      </label>

      <label className="flex flex-col gap-1">
        Longitude
        <input
          name="longitude"
          type="text"
          inputMode="decimal"
          required
          value={longitude}
          onChange={(event) => {
            setLongitude(event.target.value);
            setResolvedAddress(null);
          }}
        />
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
        {isPending ? "Adding…" : "Add pebble"}
      </button>
    </form>
  );
}
