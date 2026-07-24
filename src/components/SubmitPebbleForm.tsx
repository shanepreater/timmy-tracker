"use client";

import { useActionState, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { submitPebbleAction, type SubmitPebbleState } from "@/app/submit/actions";

const initialState: SubmitPebbleState = { status: "idle" };

type ResolvedPlace = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

type PlaceLookupProps = {
  onResolved: (place: ResolvedPlace) => void;
};

/**
 * Optional convenience on top of manual lat/long entry: type a place name,
 * resolve it via the Geocoding API, and fill in the coordinate fields.
 * Requires the Geocoding API enabled on the same Google Cloud project as
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (see README.md#getting-your-keys).
 */
function PlaceLookup({ onResolved }: PlaceLookupProps) {
  const geocodingLibrary = useMapsLibrary("geocoding");
  const [placeName, setPlaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    const trimmedPlaceName = placeName.trim();
    if (!geocodingLibrary || !trimmedPlaceName) return;

    setIsLoading(true);
    setError(null);

    try {
      const geocoder = new geocodingLibrary.Geocoder();
      const { results } = await geocoder.geocode({ address: trimmedPlaceName });
      const [first] = results;

      if (!first) {
        setError("Couldn't find that place — try a different search, or enter coordinates directly below.");
        return;
      }

      onResolved({
        latitude: first.geometry.location.lat(),
        longitude: first.geometry.location.lng(),
        formattedAddress: first.formatted_address,
      });
    } catch {
      setError("Couldn't look that up right now — enter coordinates directly below instead.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <label className="flex flex-col gap-1">
        Look up a place (optional)
        <div className="flex gap-2">
          <input
            type="text"
            value={placeName}
            onChange={(event) => {
              setPlaceName(event.target.value);
              setError(null);
            }}
            placeholder="e.g. Eiffel Tower, Paris"
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={!geocodingLibrary || isLoading || !placeName.trim()}
          >
            {isLoading ? "Looking up…" : "Look up"}
          </button>
        </div>
      </label>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

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
