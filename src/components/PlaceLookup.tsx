"use client";

import { useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

export type ResolvedPlace = {
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
 * Shared by SubmitPebbleForm (public) and the admin add-pebble form.
 */
export function PlaceLookup({ onResolved }: PlaceLookupProps) {
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
