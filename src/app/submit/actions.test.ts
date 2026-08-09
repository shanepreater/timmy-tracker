import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmitPebbleState } from "./actions";

const submitPebble = vi.fn();
const requireAllowedUser = vi.fn();
const processUploadedPebblePhoto = vi.fn();
class FakePhotoValidationError extends Error {}

class FakeUnauthorizedError extends Error {}

vi.mock("@/lib/pebbles", () => ({ submitPebble }));
vi.mock("@/lib/pebble-photos", () => ({
  processUploadedPebblePhoto,
  PhotoValidationError: FakePhotoValidationError,
}));
vi.mock("@/lib/auth-guards", () => ({
  requireAllowedUser,
  UnauthorizedError: FakeUnauthorizedError,
}));

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
  requireAllowedUser.mockReset();
  processUploadedPebblePhoto.mockReset();
  processUploadedPebblePhoto.mockResolvedValue("https://blob.example/photo.webp");
  vi.stubEnv("NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE", "true");
  vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "");
  vi.stubEnv("FEATURE_AUTH_GATE", "");
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

  it("submits with no submitterEmail when the auth gate is off", async () => {
    vi.resetModules();
    const { submitPebbleAction } = await import("./actions");

    const result = await submitPebbleAction(idle, formData(VALID));

    expect(result).toEqual({ status: "success" });
    expect(requireAllowedUser).not.toHaveBeenCalled();
    expect(submitPebble).toHaveBeenCalledWith(
      {
        latitude: 48.8584,
        longitude: 2.2945,
        depositedBy: "Sarah",
        depositedAt: new Date("2026-03-01"),
      },
      undefined,
      undefined,
    );
  });

  describe("with the auth gate on", () => {
    beforeEach(() => {
      vi.stubEnv("FEATURE_AUTH_GATE", "true");
    });

    it("errors without calling submitPebble when not an allowed user", async () => {
      vi.resetModules();
      requireAllowedUser.mockRejectedValue(new FakeUnauthorizedError());
      const { submitPebbleAction } = await import("./actions");

      const result = await submitPebbleAction(idle, formData(VALID));

      expect(result).toEqual({
        status: "error",
        errors: { depositedBy: "Sign in required to submit a pebble." },
      });
      expect(submitPebble).not.toHaveBeenCalled();
    });

    it("records the signed-in user's email as submitterEmail", async () => {
      vi.resetModules();
      requireAllowedUser.mockResolvedValue({ email: "shane@example.com" });
      const { submitPebbleAction } = await import("./actions");

      const result = await submitPebbleAction(idle, formData(VALID));

      expect(result).toEqual({ status: "success" });
      expect(submitPebble).toHaveBeenCalledWith(
        {
          latitude: 48.8584,
          longitude: 2.2945,
          depositedBy: "Sarah",
          depositedAt: new Date("2026-03-01"),
        },
        "shane@example.com",
        undefined,
      );
    });
  });

  describe("with pebble photos enabled", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "true");
    });

    it("ignores an empty rawPhotoUrl (no photo selected)", async () => {
      vi.resetModules();
      const { submitPebbleAction } = await import("./actions");

      const result = await submitPebbleAction(idle, formData(VALID));

      expect(result).toEqual({ status: "success" });
      expect(processUploadedPebblePhoto).not.toHaveBeenCalled();
      expect(submitPebble).toHaveBeenCalledWith(expect.anything(), undefined, undefined);
    });

    it("processes the raw upload and passes photoUrl to submitPebble", async () => {
      vi.resetModules();
      const { submitPebbleAction } = await import("./actions");

      const data = formData({ ...VALID, rawPhotoUrl: "https://blob.example/raw/tim.jpg" });

      const result = await submitPebbleAction(idle, data);

      expect(result).toEqual({ status: "success" });
      expect(processUploadedPebblePhoto).toHaveBeenCalledWith(
        "https://blob.example/raw/tim.jpg",
      );
      expect(submitPebble).toHaveBeenCalledWith(
        {
          latitude: 48.8584,
          longitude: 2.2945,
          depositedBy: "Sarah",
          depositedAt: new Date("2026-03-01"),
        },
        undefined,
        "https://blob.example/photo.webp",
      );
    });

    it("returns a photo error when processing throws PhotoValidationError", async () => {
      vi.resetModules();
      processUploadedPebblePhoto.mockRejectedValue(
        new FakePhotoValidationError("We couldn't process that image. Try a different file."),
      );
      const { submitPebbleAction } = await import("./actions");

      const data = formData({ ...VALID, rawPhotoUrl: "https://blob.example/raw/tim.jpg" });

      const result = await submitPebbleAction(idle, data);

      expect(result).toEqual({
        status: "error",
        errors: { photo: "We couldn't process that image. Try a different file." },
      });
      expect(submitPebble).not.toHaveBeenCalled();
    });
  });
});
