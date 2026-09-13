import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = ["FEATURE_ADMIN", "FEATURE_AUTH_GATE", "FEATURE_SECURITY_HEADERS"] as const;

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
      admin: false,
      authGate: false,
      securityHeaders: false,
    });
  });

  it("turns a flag on only when its env var is exactly 'true'", async () => {
    vi.stubEnv("FEATURE_ADMIN", "TRUE");
    vi.stubEnv("FEATURE_AUTH_GATE", "true");
    vi.stubEnv("FEATURE_SECURITY_HEADERS", "true");

    const featureFlags = await loadFlags();

    expect(featureFlags.admin).toBe(false);
    expect(featureFlags.authGate).toBe(true);
    expect(featureFlags.securityHeaders).toBe(true);
  });
});
