import { getSetting, setSetting } from "@/lib/app-settings";

/**
 * The 3 feature flags that are actually exposed to end users (they
 * gate client-rendered UI) — moved off NEXT_PUBLIC_* env vars and into
 * AppSetting so they're admin-toggleable at runtime, without a
 * redeploy, and no longer baked as plaintext into the shipped JS
 * bundle. See docs/design.md's "Dynamic feature flags" amendment.
 *
 * FEATURE_ADMIN and FEATURE_AUTH_GATE deliberately stay as env vars —
 * both are already server-only (never sent to the client, so there's
 * nothing to "hide" by moving them), and FEATURE_AUTH_GATE specifically
 * can't move: it's read synchronously in proxy.ts, which runs on the
 * Edge runtime and has no Prisma/Postgres access at all.
 */
export type DynamicFeatureFlags = {
  map: boolean;
  submitPebble: boolean;
  pebblePhotos: boolean;
};

const SETTING_KEYS = {
  map: "FEATURE_MAP",
  submitPebble: "FEATURE_SUBMIT_PEBBLE",
  pebblePhotos: "FEATURE_PEBBLE_PHOTOS",
} as const satisfies Record<keyof DynamicFeatureFlags, string>;

/** A missing row (e.g. a fresh DB nobody's seeded yet) fails closed — off, not on. */
export async function getDynamicFeatureFlags(): Promise<DynamicFeatureFlags> {
  const [map, submitPebble, pebblePhotos] = await Promise.all([
    getSetting(SETTING_KEYS.map),
    getSetting(SETTING_KEYS.submitPebble),
    getSetting(SETTING_KEYS.pebblePhotos),
  ]);

  return {
    map: map === "true",
    submitPebble: submitPebble === "true",
    pebblePhotos: pebblePhotos === "true",
  };
}

export async function setDynamicFeatureFlag(
  key: keyof DynamicFeatureFlags,
  value: boolean,
): Promise<void> {
  await setSetting(SETTING_KEYS[key], value ? "true" : "false");
}
