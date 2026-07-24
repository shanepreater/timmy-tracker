/**
 * Env-driven feature flags. Every new feature ships behind one of these,
 * defaulting to off, so the deployed site stays usable while a feature is
 * mid-flight. See docs/design.md for the rationale.
 *
 * Flags needed on the client must be prefixed NEXT_PUBLIC_ so Next.js
 * inlines them into the browser bundle at build time.
 */
export const featureFlags = {
  map: process.env.NEXT_PUBLIC_FEATURE_MAP === "true",
  submitPebble: process.env.NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE === "true",
  admin: process.env.FEATURE_ADMIN === "true",
  authGate: process.env.FEATURE_AUTH_GATE === "true",
} as const;

export type FeatureFlags = typeof featureFlags;
