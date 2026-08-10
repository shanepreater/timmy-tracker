"use client";

import { useEffect, useRef, useState } from "react";
import { PebblePhoto } from "@/components/PebblePhoto";

export type CarouselPhoto = { url: string; alt: string };

type PebblePhotoCarouselProps = {
  photos: CarouselPhoto[];
  className?: string;
};

const AUTO_ADVANCE_MS = 3000;

/**
 * Auto-advances through every photo for a pebble (primary photo first,
 * then additional ones — see Map.tsx) every 3s, looping back to the
 * start. No carousel chrome for 0 or 1 photos — prev/next buttons and
 * a page counter don't make sense for nothing or a single image.
 */
export function PebblePhotoCarousel({ photos, className }: PebblePhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function restartTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (photos.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, AUTO_ADVANCE_MS);
  }

  // Mount/photos-count-change only — NOT keyed on `index`. Ticking the
  // interval already advances `index` via the functional update above,
  // so re-running this effect on every tick would tear down and
  // recreate the timer every 3s for no reason. Manual nav resets the
  // timer imperatively (via goTo below) instead, synchronously in the
  // click handler, rather than relying on this effect noticing an
  // index change — the effect-dependency approach doubles up with
  // React's own passive-effect flush timing, which fake timers in
  // tests don't reliably drive between separate advanceTimersByTime
  // calls.
  useEffect(() => {
    restartTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);

  if (photos.length === 0) return null;

  if (photos.length === 1) {
    return <PebblePhoto src={photos[0].url} alt={photos[0].alt} className={className} />;
  }

  const current = photos[index % photos.length];

  function goTo(newIndex: number) {
    setIndex(((newIndex % photos.length) + photos.length) % photos.length);
    restartTimer();
  }

  return (
    <div className="relative">
      <PebblePhoto src={current.url} alt={current.alt} className={className} />
      <button
        type="button"
        aria-label="Previous photo"
        onClick={() => goTo(index - 1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-1.5 py-0.5 text-xs text-white hover:bg-black/70"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next photo"
        onClick={() => goTo(index + 1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-1.5 py-0.5 text-xs text-white hover:bg-black/70"
      >
        ›
      </button>
      <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/50 px-1 text-[10px] text-white">
        {index + 1} / {photos.length}
      </span>
    </div>
  );
}
