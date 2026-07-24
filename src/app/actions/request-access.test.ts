import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const createAccessRequestIfNeeded = vi.fn();

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/access-requests", () => ({ createAccessRequestIfNeeded }));

const { requestAccessAction } = await import("./request-access");

beforeEach(() => {
  authMock.mockReset();
  createAccessRequestIfNeeded.mockReset();
});

describe("requestAccessAction", () => {
  it("errors without creating a request when there's no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await requestAccessAction({ status: "idle" }, new FormData());

    expect(result.status).toBe("error");
    expect(createAccessRequestIfNeeded).not.toHaveBeenCalled();
  });

  it("creates a request for the signed-in email and returns success", async () => {
    authMock.mockResolvedValue({ user: { email: "shane@example.com", name: "Shane" } });
    createAccessRequestIfNeeded.mockResolvedValue({ id: "r1" });

    const result = await requestAccessAction({ status: "idle" }, new FormData());

    expect(result).toEqual({ status: "success" });
    expect(createAccessRequestIfNeeded).toHaveBeenCalledWith("shane@example.com", "Shane");
  });
});
