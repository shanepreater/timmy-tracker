import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "NEXT_PUBLIC_FEATURE_MAP",
  "NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE",
  "FEATURE_ADMIN",
] as const;

async function loadFlags() {
  vi.resetModules();
  const { featureFlags } = await import("./feature-flags");
  return featureFlags;
}

describe("featureFlags", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("defaults every flag to off", async () => {
    const featureFlags = await loadFlags();

    expect(featureFlags).toEqual({
      map: false,
      submitPebble: false,
      admin: false,
    });
  });

  it("turns a flag on only when its env var is exactly 'true'", async () => {
    process.env.NEXT_PUBLIC_FEATURE_MAP = "true";
    process.env.NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE = "1";
    process.env.FEATURE_ADMIN = "TRUE";

    const featureFlags = await loadFlags();

    expect(featureFlags.map).toBe(true);
    expect(featureFlags.submitPebble).toBe(false);
    expect(featureFlags.admin).toBe(false);
  });
});
