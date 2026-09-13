"use client";

import { useEffect } from "react";
import { Button } from "@/components/Button";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Split out from the default export so it can be unit-tested without the
// surrounding <html>/<body> — jsdom (and React) reject a nested <html>
// inside the test document, which GlobalError requires in real use since
// it replaces the whole document when it fires.
export function GlobalErrorContent({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Root layout error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto text-center space-y-6" role="alert">
        <h1 className="text-2xl font-bold text-foreground">
          Something went wrong
        </h1>
        <p className="text-stone-600 dark:text-stone-400">
          We&apos;re sorry, but something unexpected happened. Please try again or contact support if the problem persists.
        </p>
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  );
}

/**
 * error.tsx only catches errors thrown by page/nested-layout segments —
 * it can't catch a failure in the root layout itself (e.g. AuthGate's
 * auth()/Prisma lookup in src/app/layout.tsx throwing). This is the only
 * boundary that can, which is why Next.js requires it to render its own
 * <html>/<body> rather than nesting inside RootLayout.
 */
export default function GlobalError(props: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <GlobalErrorContent {...props} />
      </body>
    </html>
  );
}
