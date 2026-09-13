const SKELETON_CLASS = "rounded-lg bg-stone-200 dark:bg-stone-700 animate-pulse";

const FORM_ROW_SHAPES = [
  "h-4 w-1/3",
  "h-10 w-full",
  "h-4 w-1/3",
  "h-10 w-full",
  "h-4 w-1/3",
  "h-10 w-full",
];

export default function Loading() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-center">
          <div className={`w-32 h-10 ${SKELETON_CLASS}`} />
        </div>

        {/* Card skeleton */}
        <div className="bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-4">
          {/* Title */}
          <div className={`h-6 w-3/4 mx-auto ${SKELETON_CLASS}`} />

          {/* Form rows */}
          <div className="space-y-3 pt-4">
            {FORM_ROW_SHAPES.map((shape, index) => (
              <div key={index} className={`${shape} ${SKELETON_CLASS}`} />
            ))}
          </div>

          {/* Button skeleton */}
          <div className="pt-4">
            <div className={`h-10 w-full ${SKELETON_CLASS}`} />
          </div>
        </div>

        {/* Footer text skeleton */}
        <div className="flex justify-center">
          <div className={`h-4 w-1/2 ${SKELETON_CLASS}`} />
        </div>
      </div>
    </main>
  );
}
