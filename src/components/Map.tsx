"use client";

import {
  APIProvider,
  Map as GoogleMap,
  Marker,
} from "@vis.gl/react-google-maps";
import { featureFlags } from "@/lib/feature-flags";
import type { VerifiedPebble } from "@/lib/pebbles";

const DEFAULT_CENTER = { lat: 20, lng: 0 };
const DEFAULT_ZOOM = 2;

type MapProps = {
  pebbles: VerifiedPebble[];
};

/**
 * World map showing where Tim's pebbles have been placed.
 * Gated by featureFlags.map until the Maps API key is wired up, so the
 * site stays usable with the flag off.
 */
export function Map({ pebbles }: MapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!featureFlags.map || !apiKey) {
    return (
      <div
        role="status"
        className="flex h-96 w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
      >
        Map coming soon.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <GoogleMap
        style={{ width: "100%", height: "24rem", borderRadius: "0.5rem" }}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {pebbles.map((pebble) => (
          <Marker
            key={pebble.id}
            position={{ lat: pebble.latitude, lng: pebble.longitude }}
            title={`${pebble.depositedBy} — ${pebble.depositedAt.toDateString()}`}
          />
        ))}
      </GoogleMap>
    </APIProvider>
  );
}
