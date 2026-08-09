"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DynamicFeatureFlags } from "@/lib/dynamic-feature-flags";

const FeatureFlagsContext = createContext<DynamicFeatureFlags | null>(null);

/**
 * Seeded with a value a Server Component page already fetched
 * server-side (getDynamicFeatureFlags()) — not a client-side fetch —
 * so nested client components render correctly on first paint (no
 * loading flicker) and can read flags via useFeatureFlags() at any
 * depth without threading a prop through every intermediate component
 * that doesn't itself care about the value (prop drilling). Each
 * top-level page (src/app/page.tsx, submit/page.tsx, admin/page.tsx)
 * wraps its own subtree with its own already-fetched flags — see
 * docs/design.md's "Dynamic feature flags" amendment.
 */
export function FeatureFlagsProvider({
  flags,
  children,
}: {
  flags: DynamicFeatureFlags;
  children: ReactNode;
}) {
  return (
    <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>
  );
}

/** Throws if used outside a FeatureFlagsProvider — every page that renders a flag-gated client component must wrap it. */
export function useFeatureFlags(): DynamicFeatureFlags {
  const flags = useContext(FeatureFlagsContext);
  if (!flags) {
    throw new Error("useFeatureFlags() must be used within a FeatureFlagsProvider.");
  }
  return flags;
}
