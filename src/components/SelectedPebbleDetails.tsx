"use client";

import { formatPebbleDate, type VerifiedPebble } from "@/lib/pebbles";
import { PebblePhotoCarousel } from "@/components/PebblePhotoCarousel";
import { Button } from "@/components/Button";
import { useFeatureFlags } from "@/components/FeatureFlagsProvider";

type SelectedPebbleDetailsProps = {
  pebble: VerifiedPebble | null;
  onClose: () => void;
};

/**
 * Rendered as its own component below the map (see Map.tsx), not
 * inside Google's InfoWindow popup — the InfoWindow's own chrome
 * imposes tight, viewport-relative size constraints that fight
 * anything richer than a small thumbnail (a bigger photo and a CSS
 * resize handle both broke inside it in practice). A plain sibling
 * component has no such constraints, so the carousel gets real room.
 */
export function SelectedPebbleDetails({ pebble, onClose }: SelectedPebbleDetailsProps) {
  const flags = useFeatureFlags();

  if (!pebble) {
    return (
      <p role="status" className="text-stone-600 dark:text-stone-400">
        Click a pin on the map to see its photos and details.
      </p>
    );
  }

  const photos = flags.pebblePhotos
    ? [pebble.photoUrl, ...pebble.additionalPhotoUrls]
        .filter((url): url is string => Boolean(url))
        .map((url) => ({ url, alt: `Photo for ${pebble.depositedBy}` }))
    : [];

  return (
    <div className="card flex flex-col gap-4 sm:flex-row sm:items-start">
      {photos.length > 0 && (
        <PebblePhotoCarousel photos={photos} className="h-56 w-56 shrink-0" />
      )}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <span className="text-xl font-semibold">{pebble.depositedBy}</span>
          <Button type="button" variant="secondary" className="shrink-0" onClick={onClose}>
            Close
          </Button>
        </div>
        <span className="text-stone-600 dark:text-stone-400">
          {formatPebbleDate(pebble.depositedAt)}
        </span>
      </div>
    </div>
  );
}
