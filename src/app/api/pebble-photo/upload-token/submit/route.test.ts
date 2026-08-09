import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAllowedUser = vi.fn();
class FakeUnauthorizedError extends Error {}

vi.mock("@/lib/auth-guards", () => ({
  requireAllowedUser,
  UnauthorizedError: FakeUnauthorizedError,
}));

const createPebblePhotoUploadTokenResponse = vi.fn();
vi.mock("@/lib/pebble-photo-upload-token", () => ({ createPebblePhotoUploadTokenResponse }));

const getDynamicFeatureFlags = vi.fn();
vi.mock("@/lib/dynamic-feature-flags", () => ({
  getDynamicFeatureFlags: (...args: unknown[]) => getDynamicFeatureFlags(...args),
}));

function fakeRequest() {
  return new Request("https://example.com/api/pebble-photo/upload-token/submit", {
    method: "POST",
    body: JSON.stringify({ type: "blob.generate-client-token" }),
  });
}

beforeEach(() => {
  requireAllowedUser.mockReset();
  createPebblePhotoUploadTokenResponse.mockReset();
  createPebblePhotoUploadTokenResponse.mockImplementation(async (_request, authorize) => {
    await authorize();
    return { type: "blob.generate-client-token", clientToken: "fake-token" };
  });
  getDynamicFeatureFlags.mockReset();
  getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: true, pebblePhotos: true });
  vi.stubEnv("FEATURE_AUTH_GATE", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("POST /api/pebble-photo/upload-token/submit", () => {
  it("rejects with 403 when pebble photos aren't enabled", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: true, pebblePhotos: false });
    const { POST } = await import("./route");

    const response = await POST(fakeRequest());

    expect(response.status).toBe(403);
    expect(createPebblePhotoUploadTokenResponse).not.toHaveBeenCalled();
  });

  it("rejects with 403 when submissions aren't open", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: false, pebblePhotos: true });
    const { POST } = await import("./route");

    const response = await POST(fakeRequest());

    expect(response.status).toBe(403);
  });

  it("doesn't require an allowed user when the auth gate is off", async () => {
    vi.resetModules();
    const { POST } = await import("./route");

    const response = await POST(fakeRequest());

    expect(response.status).toBe(200);
    expect(requireAllowedUser).not.toHaveBeenCalled();
  });

  it("requires an allowed user when the auth gate is on, rejecting with 400 if unauthorized", async () => {
    vi.stubEnv("FEATURE_AUTH_GATE", "true");
    vi.resetModules();
    requireAllowedUser.mockRejectedValue(new FakeUnauthorizedError());
    const { POST } = await import("./route");

    const response = await POST(fakeRequest());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Sign in required to submit a pebble.");
  });

  it("succeeds for an allowed user when the auth gate is on", async () => {
    vi.stubEnv("FEATURE_AUTH_GATE", "true");
    vi.resetModules();
    requireAllowedUser.mockResolvedValue({ email: "shane@example.com" });
    const { POST } = await import("./route");

    const response = await POST(fakeRequest());

    expect(response.status).toBe(200);
  });
});
