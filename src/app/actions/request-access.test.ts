import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const createAccessRequestIfNeeded = vi.fn();
const getAllowedUser = vi.fn();

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/access-requests", () => ({ createAccessRequestIfNeeded }));
vi.mock("@/lib/auth-guards", () => ({ getAllowedUser }));

beforeEach(() => {
  authMock.mockReset();
  createAccessRequestIfNeeded.mockReset();
  getAllowedUser.mockReset();
  getAllowedUser.mockResolvedValue(null);
  vi.stubEnv("FEATURE_AUTH_GATE", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("requestAccessAction", () => {
  it("errors without creating a request when the auth gate is off", async () => {
    vi.stubEnv("FEATURE_AUTH_GATE", "");
    vi.resetModules();
    const { requestAccessAction } = await import("./request-access");

    const result = await requestAccessAction({ status: "idle" }, new FormData());

    expect(result.status).toBe("error");
    expect(createAccessRequestIfNeeded).not.toHaveBeenCalled();
    expect(authMock).not.toHaveBeenCalled();
  });

  it("errors without creating a request when there's no session", async () => {
    vi.resetModules();
    authMock.mockResolvedValue(null);
    const { requestAccessAction } = await import("./request-access");

    const result = await requestAccessAction({ status: "idle" }, new FormData());

    expect(result.status).toBe("error");
    expect(createAccessRequestIfNeeded).not.toHaveBeenCalled();
  });

  it("errors without creating a request when the account is already allowed", async () => {
    vi.resetModules();
    authMock.mockResolvedValue({ user: { email: "shane@example.com", name: "Shane" } });
    getAllowedUser.mockResolvedValue({ id: "u1", email: "shane@example.com", isAdmin: false });
    const { requestAccessAction } = await import("./request-access");

    const result = await requestAccessAction({ status: "idle" }, new FormData());

    expect(result).toEqual({ status: "error", error: "This account already has access." });
    expect(createAccessRequestIfNeeded).not.toHaveBeenCalled();
  });

  it("creates a request for the signed-in email and returns success", async () => {
    vi.resetModules();
    authMock.mockResolvedValue({ user: { email: "shane@example.com", name: "Shane" } });
    getAllowedUser.mockResolvedValue(null);
    createAccessRequestIfNeeded.mockResolvedValue({ id: "r1" });
    const { requestAccessAction } = await import("./request-access");

    const result = await requestAccessAction({ status: "idle" }, new FormData());

    expect(result).toEqual({ status: "success" });
    expect(createAccessRequestIfNeeded).toHaveBeenCalledWith("shane@example.com", "Shane");
  });
});
