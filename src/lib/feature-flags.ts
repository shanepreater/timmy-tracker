/**
 * Env-driven feature flags that stay env-driven. See docs/design.md's
 * "Dynamic feature flags" amendment for why `map`, `submitPebble`, and
 * `pebblePhotos` moved to DB-backed AppSetting rows instead
 * (src/lib/dynamic-feature-flags.ts, fetched client-side via
 * src/components/FeatureFlagsProvider.tsx) — the short version: both
 * of these stay here because they're already server-only (nothing to
 * hide by moving them), and `authGate` specifically *can't* move: it's
 * read synchronously in proxy.ts, which runs on the Edge runtime and
 * has no Prisma/Postgres access.
 */
export const featureFlags = {
  admin: process.env.FEATURE_ADMIN === "true",
  authGate: process.env.FEATURE_AUTH_GATE === "true",
} as const;

export type FeatureFlags = typeof featureFlags;
