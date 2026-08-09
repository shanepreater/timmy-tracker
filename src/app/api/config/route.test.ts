import { describe, expect, it, vi } from "vitest";

const getDynamicFeatureFlags = vi.fn();
vi.mock("@/lib/dynamic-feature-flags", () => ({ getDynamicFeatureFlags }));

const { GET } = await import("./route");

describe("GET /api/config", () => {
  it("returns the dynamic feature flags as JSON", async () => {
    getDynamicFeatureFlags.mockResolvedValue({
      map: true,
      submitPebble: false,
      pebblePhotos: true,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      map: true,
      submitPebble: false,
      pebblePhotos: true,
    });
  });
});
