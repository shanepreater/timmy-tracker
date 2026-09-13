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
import { MapPlaceholder } from "@/components/MapPlaceholder";
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
    return <MapPlaceholder />;
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
                <div className="flex flex-col gap-1 text-sm text-stone-900">
                  {photos.length > 0 && (
                    <PebblePhotoCarousel photos={photos} className="mb-2 h-24 w-24" />
                  )}
                  <span className="font-semibold">{selectedPebble.depositedBy}</span>
                  <span>{formatPebbleDate(selectedPebble.depositedAt)}</span>
                </div>
              </InfoWindow>
            );
          })()}
      </GoogleMap>
    </APIProvider>
  );
}
