"use client";

import { useState } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { featureFlags } from "@/lib/feature-flags";
import { formatPebbleDate, type VerifiedPebble } from "@/lib/pebbles";

const DEFAULT_CENTER = { lat: 20, lng: 0 };
const DEFAULT_ZOOM = 2;

type MapProps = {
  pebbles: VerifiedPebble[];
};

/**
 * World map showing where Tim's pebbles have been placed.
 * Gated by featureFlags.map until the Maps API key and Map ID are wired
 * up, so the site stays usable with the flag off. Uses AdvancedMarker
 * rather than the deprecated google.maps.Marker — see
 * https://developers.google.com/maps/documentation/javascript/advanced-markers/migration.
 * AdvancedMarkerElement only renders on a map with a Map ID, hence the
 * mapId prop and the placeholder fallback when it's unset.
 */
export function Map({ pebbles }: MapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  const [selectedPebbleId, setSelectedPebbleId] = useState<string | null>(null);

  if (!featureFlags.map || !apiKey || !mapId) {
    return (
      <div
        role="status"
        className="flex h-96 w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
      >
        Map coming soon.
      </div>
    );
  }

  const selectedPebble = pebbles.find((pebble) => pebble.id === selectedPebbleId) ?? null;

  return (
    <APIProvider apiKey={apiKey}>
      <GoogleMap
        mapId={mapId}
        style={{ width: "100%", height: "70vh", minHeight: "28rem", borderRadius: "0.5rem" }}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {pebbles.map((pebble) => (
          <AdvancedMarker
            key={pebble.id}
            position={{ lat: pebble.latitude, lng: pebble.longitude }}
            title={`${pebble.depositedBy} — ${formatPebbleDate(pebble.depositedAt)}`}
            onClick={() => setSelectedPebbleId(pebble.id)}
          />
        ))}

        {selectedPebble && (
          <InfoWindow
            position={{ lat: selectedPebble.latitude, lng: selectedPebble.longitude }}
            onCloseClick={() => setSelectedPebbleId(null)}
          >
            <div className="flex flex-col gap-1 text-sm text-zinc-900">
              <span className="font-semibold">{selectedPebble.depositedBy}</span>
              <span>{formatPebbleDate(selectedPebble.depositedAt)}</span>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </APIProvider>
  );
}
