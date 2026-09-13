import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadConfig() {
  vi.resetModules();
  const { default: nextConfig } = await import("./next.config");
  return nextConfig;
}

describe("next.config headers()", () => {
  beforeEach(() => {
    vi.stubEnv("FEATURE_SECURITY_HEADERS", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("adds no headers when the flag is off, so the live server stays backwards-compatible", async () => {
    const nextConfig = await loadConfig();

    const rules = await nextConfig.headers!();

    expect(rules).toEqual([]);
  });

  it("adds the security headers, including a CSP that allows the direct-to-Blob photo upload, when the flag is on", async () => {
    vi.stubEnv("FEATURE_SECURITY_HEADERS", "true");
    const nextConfig = await loadConfig();

    const rules = await nextConfig.headers!();

    expect(rules).toHaveLength(1);
    const headerNames = rules[0].headers.map((h) => h.key);
    expect(headerNames).toEqual(
      expect.arrayContaining([
        "Strict-Transport-Security",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Content-Security-Policy",
      ]),
    );

    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;
    // Direct browser-to-Blob upload (src/lib/pebble-photo-client-upload.ts)
    // must stay allowed, or every pebble-photo upload silently fails.
    expect(csp).toContain("https://blob.vercel-storage.com");
    // Vector map rendering (NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID) needs a blob:
    // worker.
    expect(csp).toContain("worker-src 'self' blob:");
  });
});
