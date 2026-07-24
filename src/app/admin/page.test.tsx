import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAllowedUser = vi.fn();
const listAllowedUsers = vi.fn();
const listPendingAccessRequests = vi.fn();
const listAllPebbles = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const redirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("@/lib/auth-guards", () => ({ getAllowedUser }));
vi.mock("@/lib/allowed-users", () => ({ listAllowedUsers }));
vi.mock("@/lib/access-requests", () => ({ listPendingAccessRequests }));
vi.mock("@/lib/pebbles", () => ({ listAllPebbles }));
vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("@/components/ManageUsers", () => ({
  ManageUsers: () => <div data-testid="manage-users" />,
}));
vi.mock("@/components/AdminPebbles", () => ({
  AdminPebbles: () => <div data-testid="admin-pebbles" />,
}));

beforeEach(() => {
  getAllowedUser.mockReset();
  listAllowedUsers.mockReset();
  listPendingAccessRequests.mockReset();
  listAllPebbles.mockReset();
  notFound.mockClear();
  redirect.mockClear();
  vi.stubEnv("FEATURE_ADMIN", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("AdminPage", () => {
  it("calls notFound when FEATURE_ADMIN is off", async () => {
    vi.stubEnv("FEATURE_ADMIN", "");
    vi.resetModules();
    const { default: AdminPage } = await import("./page");

    await expect(AdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getAllowedUser).not.toHaveBeenCalled();
  });

  it("redirects home when signed in but not an admin", async () => {
    vi.resetModules();
    getAllowedUser.mockResolvedValue({ id: "u1", isAdmin: false });
    const { default: AdminPage } = await import("./page");

    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("renders ManageUsers and AdminPebbles with data when isAdmin", async () => {
    vi.resetModules();
    getAllowedUser.mockResolvedValue({ id: "u1", isAdmin: true });
    listAllowedUsers.mockResolvedValue([]);
    listPendingAccessRequests.mockResolvedValue([]);
    listAllPebbles.mockResolvedValue([]);
    const { default: AdminPage } = await import("./page");

    render(await AdminPage());

    expect(screen.getByRole("heading", { name: /manage access/i })).toBeInTheDocument();
    expect(screen.getByTestId("manage-users")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /manage pebbles/i })).toBeInTheDocument();
    expect(screen.getByTestId("admin-pebbles")).toBeInTheDocument();
  });
});
