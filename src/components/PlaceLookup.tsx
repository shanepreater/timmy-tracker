"use client";

import { useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Button } from "@/components/Button";

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
    <div className="card flex flex-col gap-2 p-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">
        Look up a place (optional)
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            value={placeName}
            onChange={(event) => {
              setPlaceName(event.target.value);
              setError(null);
            }}
            placeholder="e.g. Eiffel Tower, Paris"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleLookup}
            disabled={!geocodingLibrary || isLoading || !placeName.trim()}
          >
            {isLoading ? "Looking up…" : "Look up"}
          </Button>
        </div>
      </label>
      {error && (
        <span role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
