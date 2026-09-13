/**
 * Shown wherever the real map isn't rendering yet or at all: Map.tsx's
 * own disabled state (flag off / API key or Map ID missing) and
 * src/app/page.tsx's next/dynamic loading fallback while the Map chunk
 * downloads. Kept as one component on purpose — two separately-styled
 * copies previously had different heights (h-96 vs. 70vh), causing a
 * visible layout shift the moment the map code-split chunk resolved.
 */
export function MapPlaceholder() {
  return (
    <div
      role="status"
      className="flex h-[70vh] min-h-[28rem] w-full items-center justify-center rounded-lg border border-dashed border-stone-300 text-stone-500 dark:border-stone-700 dark:text-stone-400"
    >
      Map coming soon.
    </div>
  );
}
