import { get } from "@vercel/blob";
import type { NextRequest } from "next/server";

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

function isAllowedBlobUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const blobUrl = request.nextUrl.searchParams.get("url");
  if (!blobUrl || !isAllowedBlobUrl(blobUrl)) {
    return new Response("Invalid photo URL.", { status: 400 });
  }

  try {
    let result;
    try {
      result = await get(blobUrl, { access: "public" });
    } catch {
      result = await get(blobUrl, { access: "private" });
    }

    if (result.statusCode !== 200 || !result.stream) {
      return new Response("Photo not found.", { status: 404 });
    }

    return new Response(result.stream, {
      headers: {
        "content-type": result.blob.contentType,
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Photo unavailable.", { status: 404 });
  }
}
