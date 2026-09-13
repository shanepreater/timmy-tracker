import type { NextConfig } from "next";

// Same env var as featureFlags.securityHeaders (src/lib/feature-flags.ts) —
// read directly here rather than importing that module, since
// next.config.ts loads outside the app's webpack/path-alias resolution.
const securityHeadersEnabled = process.env.FEATURE_SECURITY_HEADERS === "true";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    if (!securityHeadersEnabled) {
      return [];
    }

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com; " +
              // blob.vercel-storage.com: the raw pebble-photo upload PUTs
              // straight from the browser to Vercel Blob (bypassing the
              // Server Action 4.5MB cap — see
              // src/lib/pebble-photo-client-upload.ts). Without this the
              // upload's own fetch is CSP-blocked and every submit/admin
              // photo upload fails.
              "connect-src 'self' https://maps.googleapis.com https://blob.vercel-storage.com; " +
              // blob: worker-src is required for Google Maps' vector
              // rendering (used whenever NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is
              // set), which spins up a tile/render worker from a blob: URL.
              "worker-src 'self' blob:; " +
              "frame-src https://maps.google.com https://www.google.com; " +
              "object-src 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
