import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findUnique = vi.fn();
const redirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { allowedUser: { findUnique } } }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/RequestAccess", () => ({
  RequestAccess: ({ email }: { email: string }) => <div data-testid="request-access">{email}</div>,
}));
vi.mock("@/components/AppHeader", () => ({
  AppHeader: ({ email, isAdmin }: { email: string; isAdmin: boolean }) => (
    <div data-testid="app-header">
      {email} {isAdmin ? "(admin)" : ""}
    </div>
  ),
}));

beforeEach(() => {
  authMock.mockReset();
  findUnique.mockReset();
  redirect.mockClear();
  vi.stubEnv("FEATURE_AUTH_GATE", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("AuthGate", () => {
  it("renders children directly when the flag is off, even without a session", async () => {
    vi.stubEnv("FEATURE_AUTH_GATE", "");
    vi.resetModules();
    authMock.mockResolvedValue(null);
    const { AuthGate } = await import("./AuthGate");

    render(await AuthGate({ children: <div data-testid="app-content" /> }));

    expect(screen.getByTestId("app-content")).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("fails closed (redirects to sign-in) rather than rendering children when there's no session", async () => {
    vi.resetModules();
    authMock.mockResolvedValue(null);
    const { AuthGate } = await import("./AuthGate");

    await expect(AuthGate({ children: <div data-testid="app-content" /> })).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(redirect).toHaveBeenCalledWith("/api/auth/signin");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("renders RequestAccess when signed in but not an allowed user", async () => {
    vi.resetModules();
    authMock.mockResolvedValue({ user: { email: "nobody@example.com", name: "Nobody" } });
    findUnique.mockResolvedValue(null);
    const { AuthGate } = await import("./AuthGate");

    render(await AuthGate({ children: <div data-testid="app-content" /> }));

    expect(screen.getByTestId("request-access")).toHaveTextContent("nobody@example.com");
    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
  });

  it("renders the header + children when signed in as an allowed user", async () => {
    vi.resetModules();
    authMock.mockResolvedValue({ user: { email: "shane@example.com", name: "Shane" } });
    findUnique.mockResolvedValue({ id: "u1", email: "shane@example.com", isAdmin: true });
    const { AuthGate } = await import("./AuthGate");

    render(await AuthGate({ children: <div data-testid="app-content" /> }));

    expect(screen.getByTestId("app-header")).toHaveTextContent("shane@example.com (admin)");
    expect(screen.getByTestId("app-content")).toBeInTheDocument();
  });
});
