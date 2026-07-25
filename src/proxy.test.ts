import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";

// auth() as used here is next-auth's HOF: auth(callback) wraps callback
// with real JWT verification and calls it with req.auth populated. We
// only want to test *our* callback logic, so the mock is a passthrough
// that hands the callback straight back — tests then invoke it directly
// with a fake `req`, standing in for whatever next-auth would have
// populated req.auth with. The cast below reflects that: TypeScript
// still sees the real (unmocked) auth() signature on the import, which
// doesn't match what the mock actually hands back at runtime.
vi.mock("@/auth", () => ({
  auth: (callback: unknown) => callback,
}));

type ProxyFn = (req: { auth: unknown; nextUrl: URL }) => NextResponse;

function fakeRequest(pathname: string, session: unknown) {
  return {
    auth: session,
    nextUrl: new URL(`http://localhost:3000${pathname}`),
  };
}

beforeEach(() => {
  vi.stubEnv("FEATURE_AUTH_GATE", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadProxy(): Promise<ProxyFn> {
  const mod = await import("./proxy");
  return mod.default as unknown as ProxyFn;
}

describe("proxy (Edge auth gate)", () => {
  it("passes requests through when the flag is off, even with no session", async () => {
    vi.stubEnv("FEATURE_AUTH_GATE", "");
    vi.resetModules();
    const proxy = await loadProxy();

    const response = proxy(fakeRequest("/admin", null));

    expect(response.status).not.toBe(307);
  });

  it("redirects to sign-in, preserving the callback path, when unauthenticated", async () => {
    vi.resetModules();
    const proxy = await loadProxy();

    const response = proxy(fakeRequest("/admin", null));

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/api/auth/signin");
    expect(location).toContain("callbackUrl=%2Fadmin");
  });

  it("preserves the query string in the callback URL, not just the path", async () => {
    vi.resetModules();
    const proxy = await loadProxy();

    const response = proxy(fakeRequest("/admin?tab=pending&sort=asc", null));

    const location = response.headers.get("location");
    expect(location).toContain("callbackUrl=%2Fadmin%3Ftab%3Dpending%26sort%3Dasc");
  });

  it("passes requests through when there's a session", async () => {
    vi.resetModules();
    const proxy = await loadProxy();

    const response = proxy(fakeRequest("/", { user: { email: "shane@example.com" } }));

    expect(response.status).not.toBe(307);
  });
});

describe("proxy's matcher pattern", () => {
  // Next.js requires config.matcher to be a static string literal
  // inlined in proxy.ts — it statically parses the file at build time
  // and rejects a reference to an external constant ("Entry matcher[0]
  // need to be static strings or static objects"), so this is a
  // deliberate copy of that literal, not an import. Keep in sync with
  // proxy.ts's config.matcher.
  //
  // This exists because that requirement bit us for real: an earlier
  // version of this file exported the pattern as a named constant and
  // referenced it from config.matcher. The production build failed
  // outright, but Turbopack's dev server didn't — it silently ran the
  // proxy for every request instead of honoring any exclusion, which
  // broke /tim.jpg (the header logo/favicon source) under
  // FEATURE_AUTH_GATE=true. Caught by manually curling a live dev
  // server, not by any test, hence this one.
  const MATCHER_PATTERN =
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)";
  const matcherRegex = new RegExp(`^${MATCHER_PATTERN}$`);

  it("stays in sync with proxy.ts's actual config.matcher — not just a copy that could silently drift", () => {
    const proxySource = readFileSync(path.join(process.cwd(), "src/proxy.ts"), "utf-8");
    // MATCHER_PATTERN is the *runtime* string value (backslashes already
    // unescaped by the JS parser); proxySource is raw file text, where a
    // literal backslash is written as "\\" — re-escape before comparing,
    // or this always fails regardless of whether the patterns actually match.
    const patternAsSourceLiteral = MATCHER_PATTERN.replace(/\\/g, "\\\\");
    expect(proxySource).toContain(patternAsSourceLiteral);
  });

  it.each(["/tim.jpg", "/icon.png", "/logo.svg", "/favicon.ico"])(
    "excludes static asset path %s",
    (path) => {
      expect(matcherRegex.test(path)).toBe(false);
    },
  );

  it.each(["/api/auth/signin", "/_next/static/chunks/main.js", "/_next/image"])(
    "excludes framework/auth path %s",
    (path) => {
      expect(matcherRegex.test(path)).toBe(false);
    },
  );

  it.each(["/", "/admin", "/submit", "/api/other"])(
    "includes real route %s",
    (path) => {
      expect(matcherRegex.test(path)).toBe(true);
    },
  );
});
