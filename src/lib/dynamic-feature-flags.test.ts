import { beforeEach, describe, expect, it, vi } from "vitest";

const getSetting = vi.fn();
const setSetting = vi.fn();

vi.mock("@/lib/app-settings", () => ({ getSetting, setSetting }));

const { getDynamicFeatureFlags, setDynamicFeatureFlag } = await import("./dynamic-feature-flags");

beforeEach(() => {
  getSetting.mockReset();
  setSetting.mockReset();
});

describe("getDynamicFeatureFlags", () => {
  it("reads all three flags by their AppSetting keys", async () => {
    getSetting.mockImplementation(async (key: string) =>
      ({ FEATURE_MAP: "true", FEATURE_SUBMIT_PEBBLE: "false", FEATURE_PEBBLE_PHOTOS: "true" })[
        key
      ] ?? null,
    );

    const flags = await getDynamicFeatureFlags();

    expect(flags).toEqual({ map: true, submitPebble: false, pebblePhotos: true });
    expect(getSetting).toHaveBeenCalledWith("FEATURE_MAP");
    expect(getSetting).toHaveBeenCalledWith("FEATURE_SUBMIT_PEBBLE");
    expect(getSetting).toHaveBeenCalledWith("FEATURE_PEBBLE_PHOTOS");
  });

  it("fails closed (off) when a setting is missing", async () => {
    getSetting.mockResolvedValue(null);

    expect(await getDynamicFeatureFlags()).toEqual({
      map: false,
      submitPebble: false,
      pebblePhotos: false,
    });
  });
});

describe("setDynamicFeatureFlag", () => {
  it("writes the setting for the given key as 'true'/'false'", async () => {
    await setDynamicFeatureFlag("map", true);
    expect(setSetting).toHaveBeenCalledWith("FEATURE_MAP", "true");

    await setDynamicFeatureFlag("pebblePhotos", false);
    expect(setSetting).toHaveBeenCalledWith("FEATURE_PEBBLE_PHOTOS", "false");
  });
});
