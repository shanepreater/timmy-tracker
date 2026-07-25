import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "NEXT_PUBLIC_FEATURE_MAP",
  "NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE",
  "NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS",
  "FEATURE_ADMIN",
  "FEATURE_AUTH_GATE",
] as const;

async function loadFlags() {
  vi.resetModules();
  const { featureFlags } = await import("./feature-flags");
  return featureFlags;
}

describe("featureFlags", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      vi.stubEnv(key, "");
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults every flag to off", async () => {
    const featureFlags = await loadFlags();

    expect(featureFlags).toEqual({
      map: false,
      submitPebble: false,
      pebblePhotos: false,
      admin: false,
      authGate: false,
    });
  });

  it("turns a flag on only when its env var is exactly 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_MAP", "true");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE", "1");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "true");
    vi.stubEnv("FEATURE_ADMIN", "TRUE");
    vi.stubEnv("FEATURE_AUTH_GATE", "true");

    const featureFlags = await loadFlags();

    expect(featureFlags.map).toBe(true);
    expect(featureFlags.submitPebble).toBe(false);
    expect(featureFlags.pebblePhotos).toBe(true);
    expect(featureFlags.admin).toBe(false);
    expect(featureFlags.authGate).toBe(true);
  });
});
