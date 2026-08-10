import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmitPebbleState } from "./actions";

const submitPebble = vi.fn();
const requireAllowedUser = vi.fn();
const processUploadedPebblePhoto = vi.fn();
const processUploadedPebblePhotos = vi.fn();
const getDynamicFeatureFlags = vi.fn();
const getMaxAdditionalPhotos = vi.fn();
class FakePhotoValidationError extends Error {}

class FakeUnauthorizedError extends Error {}

vi.mock("@/lib/pebbles", () => ({ submitPebble }));
vi.mock("@/lib/pebble-photos", () => ({
  processUploadedPebblePhoto,
  processUploadedPebblePhotos,
  PhotoValidationError: FakePhotoValidationError,
}));
vi.mock("@/lib/pebble-additional-photos", () => ({
  getMaxAdditionalPhotos: (...args: unknown[]) => getMaxAdditionalPhotos(...args),
}));
vi.mock("@/lib/auth-guards", () => ({
  requireAllowedUser,
  UnauthorizedError: FakeUnauthorizedError,
}));
vi.mock("@/lib/dynamic-feature-flags", () => ({
  getDynamicFeatureFlags: (...args: unknown[]) => getDynamicFeatureFlags(...args),
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
  processUploadedPebblePhotos.mockReset();
  processUploadedPebblePhotos.mockResolvedValue([]);
  getDynamicFeatureFlags.mockReset();
  getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: true, pebblePhotos: false });
  getMaxAdditionalPhotos.mockReset();
  getMaxAdditionalPhotos.mockResolvedValue(5);
  vi.stubEnv("FEATURE_AUTH_GATE", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("submitPebbleAction", () => {
  it("errors without calling submitPebble when the feature flag is off", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: false, pebblePhotos: false });
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
        undefined,
      );
    });
  });

  describe("with pebble photos enabled", () => {
    beforeEach(() => {
      getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: true, pebblePhotos: true });
    });

    it("ignores an empty rawPhotoUrl (no photo selected)", async () => {
      vi.resetModules();
      const { submitPebbleAction } = await import("./actions");

      const result = await submitPebbleAction(idle, formData(VALID));

      expect(result).toEqual({ status: "success" });
      expect(processUploadedPebblePhoto).not.toHaveBeenCalled();
      expect(processUploadedPebblePhotos).not.toHaveBeenCalled();
      expect(submitPebble).toHaveBeenCalledWith(expect.anything(), undefined, undefined, undefined);
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
        undefined,
      );
    });

    it("returns a photo error when processing the primary photo throws PhotoValidationError", async () => {
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

    it("processes additional photos and passes them to submitPebble", async () => {
      vi.resetModules();
      processUploadedPebblePhotos.mockResolvedValue([
        "https://blob.example/extra-a.webp",
        "https://blob.example/extra-b.webp",
      ]);
      const { submitPebbleAction } = await import("./actions");

      const data = formData(VALID);
      data.append("additionalPhotoUrls", "https://blob.example/raw/extra-a.jpg");
      data.append("additionalPhotoUrls", "https://blob.example/raw/extra-b.jpg");

      const result = await submitPebbleAction(idle, data);

      expect(result).toEqual({ status: "success" });
      expect(processUploadedPebblePhotos).toHaveBeenCalledWith([
        "https://blob.example/raw/extra-a.jpg",
        "https://blob.example/raw/extra-b.jpg",
      ]);
      expect(submitPebble).toHaveBeenCalledWith(expect.anything(), undefined, undefined, [
        "https://blob.example/extra-a.webp",
        "https://blob.example/extra-b.webp",
      ]);
    });

    it("rejects (without processing anything) when more additional photos are submitted than the configured max", async () => {
      vi.resetModules();
      getMaxAdditionalPhotos.mockResolvedValue(1);
      const { submitPebbleAction } = await import("./actions");

      const data = formData(VALID);
      data.append("additionalPhotoUrls", "https://blob.example/raw/extra-a.jpg");
      data.append("additionalPhotoUrls", "https://blob.example/raw/extra-b.jpg");

      const result = await submitPebbleAction(idle, data);

      expect(result).toEqual({
        status: "error",
        errors: { photo: "You can add at most 1 additional photos." },
      });
      expect(processUploadedPebblePhotos).not.toHaveBeenCalled();
      expect(submitPebble).not.toHaveBeenCalled();
    });

    it("returns a photo error when processing an additional photo throws PhotoValidationError", async () => {
      vi.resetModules();
      processUploadedPebblePhotos.mockRejectedValue(
        new FakePhotoValidationError("We couldn't process that image. Try a different file."),
      );
      const { submitPebbleAction } = await import("./actions");

      const data = formData(VALID);
      data.append("additionalPhotoUrls", "https://blob.example/raw/extra-a.jpg");

      const result = await submitPebbleAction(idle, data);

      expect(result).toEqual({
        status: "error",
        errors: { photo: "We couldn't process that image. Try a different file." },
      });
      expect(submitPebble).not.toHaveBeenCalled();
    });
  });
});
