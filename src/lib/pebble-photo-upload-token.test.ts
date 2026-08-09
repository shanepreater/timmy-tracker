import { describe, expect, it, vi } from "vitest";

type OnBeforeGenerateToken = (
  pathname: string,
  clientPayload: string | null,
  multipart: boolean,
) => Promise<unknown>;

const handleUpload = vi.fn(
  async ({ onBeforeGenerateToken }: { onBeforeGenerateToken: OnBeforeGenerateToken }) => {
    const config = await onBeforeGenerateToken("pebbles-raw/tim.jpg", null, false);
    return { type: "blob.generate-client-token", clientToken: "fake-token", ...(config as object) };
  },
);

vi.mock("@vercel/blob/client", () => ({ handleUpload }));

const { createPebblePhotoUploadTokenResponse } = await import("./pebble-photo-upload-token");

function fakeRequest(body: unknown) {
  return new Request("https://example.com/api/pebble-photo/upload-token/submit", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("createPebblePhotoUploadTokenResponse", () => {
  it("runs authorize() before returning the client-token config", async () => {
    const authorize = vi.fn().mockResolvedValue(undefined);

    const response = await createPebblePhotoUploadTokenResponse(
      fakeRequest({ type: "blob.generate-client-token" }),
      authorize,
    );

    expect(authorize).toHaveBeenCalledTimes(1);
    expect(response).toMatchObject({
      allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
      maximumSizeInBytes: 8 * 1024 * 1024,
      addRandomSuffix: true,
    });
  });

  it("propagates authorize() throwing without generating a token", async () => {
    const authorize = vi.fn().mockRejectedValue(new Error("Sign in required."));

    await expect(
      createPebblePhotoUploadTokenResponse(
        fakeRequest({ type: "blob.generate-client-token" }),
        authorize,
      ),
    ).rejects.toThrow("Sign in required.");
  });
});
