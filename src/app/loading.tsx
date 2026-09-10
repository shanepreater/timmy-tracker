export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-center">
          <div className="w-32 h-10 rounded-lg bg-stone-200 animate-pulse" />
        </div>

        {/* Card skeleton */}
        <div className="bg-stone-100 rounded-xl border border-stone-200 p-6 space-y-4">
          {/* Title */}
          <div className="h-6 w-3/4 mx-auto rounded bg-stone-200 animate-pulse" />

          {/* Form rows */}
          <div className="space-y-3 pt-4">
            <div className="h-4 w-1/3 rounded bg-stone-200 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-stone-200 animate-pulse" />
            <div className="h-4 w-1/3 rounded bg-stone-200 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-stone-200 animate-pulse" />
            <div className="h-4 w-1/3 rounded bg-stone-200 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-stone-200 animate-pulse" />
          </div>

          {/* Button skeleton */}
          <div className="pt-4">
            <div className="h-10 w-full rounded-lg bg-stone-200 animate-pulse" />
          </div>
        </div>

        {/* Footer text skeleton */}
        <div className="flex justify-center">
          <div className="h-4 w-1/2 rounded bg-stone-200 animate-pulse" />
        </div>
      </div>
    </main>
  );
}
