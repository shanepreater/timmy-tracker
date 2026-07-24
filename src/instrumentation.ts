/**
 * Runs once when the server starts. Used here purely as a safety net:
 * FEATURE_AUTH_GATE defaulting to off is deliberate for local dev, but
 * the same default in a misconfigured production deploy would silently
 * leave the whole site public. See docs/design-access-control.md's
 * "Fail-open risk" section — this is a loud warning, not a hard crash.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { featureFlags } = await import("@/lib/feature-flags");

  if (process.env.VERCEL_ENV === "production" && !featureFlags.authGate) {
    console.warn(
      "⚠️  FEATURE_AUTH_GATE is OFF in production — the site is fully public.",
    );
  }
}
