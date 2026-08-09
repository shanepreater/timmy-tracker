import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();

vi.mock("@/lib/auth-guards", () => ({ requireAdmin }));

const createPebblePhotoUploadTokenResponse = vi.fn();
vi.mock("@/lib/pebble-photo-upload-token", () => ({ createPebblePhotoUploadTokenResponse }));

const getDynamicFeatureFlags = vi.fn();
vi.mock("@/lib/dynamic-feature-flags", () => ({
  getDynamicFeatureFlags: (...args: unknown[]) => getDynamicFeatureFlags(...args),
}));

function fakeRequest() {
  return new Request("https://example.com/api/pebble-photo/upload-token/admin", {
    method: "POST",
    body: JSON.stringify({ type: "blob.generate-client-token" }),
  });
}

beforeEach(() => {
  requireAdmin.mockReset();
  createPebblePhotoUploadTokenResponse.mockReset();
  createPebblePhotoUploadTokenResponse.mockImplementation(async (_request, authorize) => {
    await authorize();
    return { type: "blob.generate-client-token", clientToken: "fake-token" };
  });
  getDynamicFeatureFlags.mockReset();
  getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: false, pebblePhotos: true });
  vi.stubEnv("FEATURE_ADMIN", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("POST /api/pebble-photo/upload-token/admin", () => {
  it("rejects with 403 when the admin section isn't enabled", async () => {
    vi.stubEnv("FEATURE_ADMIN", "");
    vi.resetModules();
    const { POST } = await import("./route");

    const response = await POST(fakeRequest());

    expect(response.status).toBe(403);
    expect(createPebblePhotoUploadTokenResponse).not.toHaveBeenCalled();
  });

  it("rejects with 403 when pebble photos aren't enabled", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: false, pebblePhotos: false });
    const { POST } = await import("./route");

    const response = await POST(fakeRequest());

    expect(response.status).toBe(403);
  });

  it("always requires admin, rejecting with 400 if not admin", async () => {
    requireAdmin.mockRejectedValue(new Error("Admin access required."));
    const { POST } = await import("./route");

    const response = await POST(fakeRequest());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Admin access required.");
    expect(requireAdmin).toHaveBeenCalledTimes(1);
  });

  it("succeeds for an admin", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com", isAdmin: true });
    const { POST } = await import("./route");

    const response = await POST(fakeRequest());

    expect(response.status).toBe(200);
  });
});
