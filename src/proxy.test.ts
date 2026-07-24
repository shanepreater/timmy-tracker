import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextResponse } from "next/server";

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

  it("passes requests through when there's a session", async () => {
    vi.resetModules();
    const proxy = await loadProxy();

    const response = proxy(fakeRequest("/", { user: { email: "shane@example.com" } }));

    expect(response.status).not.toBe(307);
  });
});
