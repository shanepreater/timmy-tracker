"use client";

import { useState } from "react";

type PebblePhotoProps = {
  src: string;
  alt: string;
  className?: string;
};

export function PebblePhoto({ src, alt, className }: PebblePhotoProps) {
  const [isBroken, setIsBroken] = useState(false);

  if (isBroken) {
    return (
      <div
        role="status"
        className={`flex items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 ${className ?? ""}`.trim()}
      >
        Photo unavailable
      </div>
    );
  }

  return (
    // Deliberately bypass next/image for remote Blob URLs to avoid
    // extra optimization-pipeline cost; see docs/design-pebble-photos.md.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`rounded-md object-cover ${className ?? ""}`.trim()}
      onError={() => setIsBroken(true)}
    />
  );
}
