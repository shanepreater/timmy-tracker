"use client";

import { useActionState, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { submitPebbleAction, type SubmitPebbleState } from "@/app/submit/actions";
import { PlaceLookup, type ResolvedPlace } from "@/components/PlaceLookup";

const initialState: SubmitPebbleState = { status: "idle" };

export function SubmitPebbleForm() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [state, formAction, isPending] = useActionState(submitPebbleAction, initialState);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  if (state.status === "success") {
    return (
      <p role="status" className="text-lg">
        Thank you — your pebble has been submitted and is awaiting review.
      </p>
    );
  }

  const errors = state.status === "error" ? state.errors : {};

  function handleResolved(place: ResolvedPlace) {
    setLatitude(String(place.latitude));
    setLongitude(String(place.longitude));
    setResolvedAddress(place.formattedAddress);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
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
        {isPending ? "Submitting…" : "Submit pebble"}
      </button>
    </form>
  );
}
