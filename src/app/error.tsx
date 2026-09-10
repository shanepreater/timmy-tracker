"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDigest, setShowDigest] = useState(false);

  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("App error:", error);
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        {/* Error icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-stone-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-stone-800">
            Something went wrong
          </h1>
          <p className="text-stone-600">
            We&apos;re sorry, but something unexpected happened. Please try again or contact support if the problem persists.
          </p>
        </div>

        {/* Retry button */}
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-stone-800 text-white font-medium hover:bg-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
        >
          Try again
        </button>

        {/* Error digest (collapsible, for support) */}
        {error.digest && (
          <div className="pt-4 border-t border-stone-200">
            <button
              onClick={() => setShowDigest(!showDigest)}
              className="text-sm text-stone-500 hover:text-stone-700 underline focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 rounded"
            >
              {showDigest ? "Hide" : "Show"} error details
            </button>
            {showDigest && (
              <div className="mt-3 p-3 bg-stone-100 rounded-lg border border-stone-200">
                <p className="text-xs font-mono text-stone-600 break-all">
                  Error ID: {error.digest}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
