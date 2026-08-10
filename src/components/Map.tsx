"use client";

import { useState } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { useFeatureFlags } from "@/components/FeatureFlagsProvider";
import { formatPebbleDate, type VerifiedPebble } from "@/lib/pebbles";
import { PebblePhoto } from "@/components/PebblePhoto";
import { PebblePhotoCarousel } from "@/components/PebblePhotoCarousel";

const DEFAULT_CENTER = { lat: 20, lng: 0 };
const DEFAULT_ZOOM = 2;

type MapProps = {
  pebbles: VerifiedPebble[];
};

/**
 * World map showing where Tim's pebbles have been placed.
 * Gated by flags.map until the Maps API key and Map ID are wired
 * up, so the site stays usable with the flag off. Uses AdvancedMarker
 * rather than the deprecated google.maps.Marker — see
 * https://developers.google.com/maps/documentation/javascript/advanced-markers/migration.
 * AdvancedMarkerElement only renders on a map with a Map ID, hence the
 * mapId prop and the placeholder fallback when it's unset.
 */
export function Map({ pebbles }: MapProps) {
  const flags = useFeatureFlags();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  const [selectedPebbleId, setSelectedPebbleId] = useState<string | null>(null);

  if (!flags.map || !apiKey || !mapId) {
    return (
      <div
        role="status"
        className="flex h-96 w-full items-center justify-center rounded-lg border border-dashed border-stone-300 text-stone-500 dark:border-stone-700 dark:text-stone-400"
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
        {pebbles.map((pebble) => {
          const title = `${pebble.depositedBy} — ${formatPebbleDate(pebble.depositedAt)}`;

          if (flags.pebblePhotos && pebble.photoUrl) {
            return (
              <AdvancedMarker
                key={pebble.id}
                position={{ lat: pebble.latitude, lng: pebble.longitude }}
                title={title}
                onClick={() => setSelectedPebbleId(pebble.id)}
              >
                <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-stone-100 shadow-lg dark:border-stone-900 dark:bg-stone-800">
                  <PebblePhoto
                    src={pebble.photoUrl}
                    alt={`Marker photo for ${pebble.depositedBy}`}
                    className="h-full w-full"
                  />
                </div>
              </AdvancedMarker>
            );
          }

          return (
            <AdvancedMarker
              key={pebble.id}
              position={{ lat: pebble.latitude, lng: pebble.longitude }}
              title={title}
              onClick={() => setSelectedPebbleId(pebble.id)}
            />
          );
        })}

        {selectedPebble &&
          (() => {
            const photos = flags.pebblePhotos
              ? [selectedPebble.photoUrl, ...selectedPebble.additionalPhotoUrls]
                  .filter((url): url is string => Boolean(url))
                  .map((url) => ({ url, alt: `Photo for ${selectedPebble.depositedBy}` }))
              : [];

            return (
              <InfoWindow
                position={{ lat: selectedPebble.latitude, lng: selectedPebble.longitude }}
                onCloseClick={() => setSelectedPebbleId(null)}
              >
                <div
                  className="flex w-72 min-w-[14rem] max-w-[90vw] min-h-[8rem] max-h-[80vh]
                    resize flex-col gap-2 overflow-auto text-base text-stone-900"
                >
                  {photos.length > 0 && (
                    <PebblePhotoCarousel photos={photos} className="h-48 w-full" />
                  )}
                  <span className="text-lg font-semibold">{selectedPebble.depositedBy}</span>
                  <span>{formatPebbleDate(selectedPebble.depositedAt)}</span>
                </div>
              </InfoWindow>
            );
          })()}
      </GoogleMap>
    </APIProvider>
  );
}
