import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmitPebbleState } from "./actions";

const submitPebble = vi.fn();

vi.mock("@/lib/pebbles", () => ({ submitPebble }));

const VALID = {
  latitude: "48.8584",
  longitude: "2.2945",
  depositedBy: "Sarah",
  depositedAt: "2026-03-01",
};

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

const idle: SubmitPebbleState = { status: "idle" };

beforeEach(() => {
  submitPebble.mockReset();
  submitPebble.mockResolvedValue(undefined);
  vi.stubEnv("NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("submitPebbleAction", () => {
  it("errors without calling submitPebble when the feature flag is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE", "");
    vi.resetModules();
    const { submitPebbleAction } = await import("./actions");

    const result = await submitPebbleAction(idle, formData(VALID));

    expect(result.status).toBe("error");
    expect(submitPebble).not.toHaveBeenCalled();
  });

  it("returns field errors for invalid input without calling submitPebble", async () => {
    vi.resetModules();
    const { submitPebbleAction } = await import("./actions");

    const result = await submitPebbleAction(idle, formData({ ...VALID, latitude: "999" }));

    expect(result).toEqual({
      status: "error",
      errors: { latitude: "Enter a latitude between -90 and 90." },
    });
    expect(submitPebble).not.toHaveBeenCalled();
  });

  it("submits and returns success for valid input", async () => {
    vi.resetModules();
    const { submitPebbleAction } = await import("./actions");

    const result = await submitPebbleAction(idle, formData(VALID));

    expect(result).toEqual({ status: "success" });
    expect(submitPebble).toHaveBeenCalledWith({
      latitude: 48.8584,
      longitude: 2.2945,
      depositedBy: "Sarah",
      depositedAt: new Date("2026-03-01"),
    });
  });
});
