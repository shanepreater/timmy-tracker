import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const get = vi.fn();

vi.mock("@vercel/blob", () => ({ get }));

const { GET } = await import("./route");

function makeRequest(url?: string): NextRequest {
  const params = new URLSearchParams();
  if (url !== undefined) params.set("url", url);
  return {
    nextUrl: { searchParams: params },
  } as unknown as NextRequest;
}

describe("GET /api/pebble-photo", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("rejects missing url", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it("rejects urls outside the pebbles/ prefix", async () => {
    const response = await GET(
      makeRequest("https://store.public.blob.vercel-storage.com/other/secret.webp"),
    );
    expect(response.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it("rejects non-webp files even under pebbles/", async () => {
    const response = await GET(
      makeRequest("https://store.public.blob.vercel-storage.com/pebbles/photo.png"),
    );
    expect(response.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it("rejects urls on a non-blob host", async () => {
    const response = await GET(makeRequest("https://evil.example.com/pebbles/photo.webp"));
    expect(response.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it("proxies allowed pebbles/ webp urls", async () => {
    get.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream(),
      blob: { contentType: "image/webp" },
    });

    const response = await GET(
      makeRequest("https://store.public.blob.vercel-storage.com/pebbles/photo.webp"),
    );

    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith(
      "https://store.public.blob.vercel-storage.com/pebbles/photo.webp",
      { access: "public" },
    );
  });
});
