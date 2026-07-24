import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("register", () => {
  it("warns when FEATURE_AUTH_GATE is off in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("FEATURE_AUTH_GATE", "");
    vi.resetModules();
    const { register } = await import("./instrumentation");

    await register();

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("FEATURE_AUTH_GATE"));
  });

  it("doesn't warn when FEATURE_AUTH_GATE is on in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("FEATURE_AUTH_GATE", "true");
    vi.resetModules();
    const { register } = await import("./instrumentation");

    await register();

    expect(console.warn).not.toHaveBeenCalled();
  });

  it("doesn't warn outside production, even with the flag off", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("FEATURE_AUTH_GATE", "");
    vi.resetModules();
    const { register } = await import("./instrumentation");

    await register();

    expect(console.warn).not.toHaveBeenCalled();
  });

  it("does nothing outside the Node.js runtime (e.g. Edge)", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("FEATURE_AUTH_GATE", "");
    vi.resetModules();
    const { register } = await import("./instrumentation");

    await register();

    expect(console.warn).not.toHaveBeenCalled();
  });
});
