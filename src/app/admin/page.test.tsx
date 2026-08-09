import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAllowedUser = vi.fn();
const listAllowedUsers = vi.fn();
const listPendingAccessRequests = vi.fn();
const listAllPebbles = vi.fn();
const listOrphanedPhotoUploads = vi.fn();
const getOrphanMinAgeMinutes = vi.fn();
const getDynamicFeatureFlags = vi.fn();
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
vi.mock("@/lib/pebble-photo-orphans", () => ({ listOrphanedPhotoUploads, getOrphanMinAgeMinutes }));
vi.mock("@/lib/dynamic-feature-flags", () => ({
  getDynamicFeatureFlags: (...args: unknown[]) => getDynamicFeatureFlags(...args),
}));
vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("@/components/ManageUsers", () => ({
  ManageUsers: () => <div data-testid="manage-users" />,
}));
vi.mock("@/components/AdminPebbles", () => ({
  AdminPebbles: () => <div data-testid="admin-pebbles" />,
}));
vi.mock("@/components/ManageOrphanedPhotos", () => ({
  ManageOrphanedPhotos: () => <div data-testid="manage-orphaned-photos" />,
}));
vi.mock("@/components/ManageFeatureFlags", () => ({
  ManageFeatureFlags: () => <div data-testid="manage-feature-flags" />,
}));
vi.mock("@/components/ManageOrphanDelay", () => ({
  ManageOrphanDelay: () => <div data-testid="manage-orphan-delay" />,
}));

const PHOTOS_OFF = { map: false, submitPebble: false, pebblePhotos: false };
const PHOTOS_ON = { map: false, submitPebble: false, pebblePhotos: true };

beforeEach(() => {
  getAllowedUser.mockReset();
  listAllowedUsers.mockReset();
  listPendingAccessRequests.mockReset();
  listAllPebbles.mockReset();
  listOrphanedPhotoUploads.mockReset();
  listOrphanedPhotoUploads.mockResolvedValue([]);
  getOrphanMinAgeMinutes.mockReset();
  getOrphanMinAgeMinutes.mockResolvedValue(15);
  getDynamicFeatureFlags.mockReset();
  getDynamicFeatureFlags.mockResolvedValue(PHOTOS_OFF);
  notFound.mockClear();
  redirect.mockClear();
  vi.stubEnv("FEATURE_ADMIN", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function searchParams(tab?: string) {
  return Promise.resolve({ tab });
}

describe("AdminPage", () => {
  it("calls notFound when FEATURE_ADMIN is off", async () => {
    vi.stubEnv("FEATURE_ADMIN", "");
    vi.resetModules();
    const { default: AdminPage } = await import("./page");

    await expect(AdminPage({ searchParams: searchParams() })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getAllowedUser).not.toHaveBeenCalled();
  });

  it("redirects home when signed in but not an admin", async () => {
    vi.resetModules();
    getAllowedUser.mockResolvedValue({ id: "u1", isAdmin: false });
    const { default: AdminPage } = await import("./page");

    await expect(AdminPage({ searchParams: searchParams() })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("defaults to the access tab, with a single h1 and the section as h2", async () => {
    vi.resetModules();
    getAllowedUser.mockResolvedValue({ id: "u1", isAdmin: true });
    listAllowedUsers.mockResolvedValue([]);
    listPendingAccessRequests.mockResolvedValue([]);
    listAllPebbles.mockResolvedValue([]);
    const { default: AdminPage } = await import("./page");

    render(await AdminPage({ searchParams: searchParams() }));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: /manage access/i })).toBeInTheDocument();
    expect(screen.getByTestId("manage-users")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-pebbles")).not.toBeInTheDocument();
  });

  it("shows the pebbles tab when ?tab=pebbles", async () => {
    vi.resetModules();
    getAllowedUser.mockResolvedValue({ id: "u1", isAdmin: true });
    listAllowedUsers.mockResolvedValue([]);
    listPendingAccessRequests.mockResolvedValue([]);
    listAllPebbles.mockResolvedValue([]);
    const { default: AdminPage } = await import("./page");

    render(await AdminPage({ searchParams: searchParams("pebbles") }));

    expect(screen.getByRole("heading", { level: 2, name: /manage pebbles/i })).toBeInTheDocument();
    expect(screen.getByTestId("admin-pebbles")).toBeInTheDocument();
    expect(screen.queryByTestId("manage-users")).not.toBeInTheDocument();
    expect(screen.queryByTestId("manage-orphaned-photos")).not.toBeInTheDocument();
  });

  it("doesn't show the orphaned-photos tab when pebble photos are disabled", async () => {
    vi.resetModules();
    getAllowedUser.mockResolvedValue({ id: "u1", isAdmin: true });
    listAllowedUsers.mockResolvedValue([]);
    listPendingAccessRequests.mockResolvedValue([]);
    listAllPebbles.mockResolvedValue([]);
    const { default: AdminPage } = await import("./page");

    render(await AdminPage({ searchParams: searchParams("orphans") }));

    // Falls back to the access tab — ?tab=orphans is only honored when
    // the feature that produces orphans is actually on.
    expect(screen.getByRole("heading", { level: 2, name: /manage access/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /orphaned photos/i })).not.toBeInTheDocument();
    expect(listOrphanedPhotoUploads).not.toHaveBeenCalled();
  });

  it("shows the orphaned-photos tab on its own, separate from Manage pebbles", async () => {
    getDynamicFeatureFlags.mockResolvedValue(PHOTOS_ON);
    vi.resetModules();
    getAllowedUser.mockResolvedValue({ id: "u1", isAdmin: true });
    listAllowedUsers.mockResolvedValue([]);
    listPendingAccessRequests.mockResolvedValue([]);
    listAllPebbles.mockResolvedValue([]);
    const { default: AdminPage } = await import("./page");

    render(await AdminPage({ searchParams: searchParams("orphans") }));

    expect(
      screen.getByRole("heading", { level: 2, name: /orphaned photo uploads/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("manage-orphaned-photos")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-pebbles")).not.toBeInTheDocument();
    expect(listOrphanedPhotoUploads).toHaveBeenCalledTimes(1);
    expect(listOrphanedPhotoUploads).toHaveBeenCalledWith(15);
  });

  it("shows the settings tab with feature flags and the orphan-delay control", async () => {
    vi.resetModules();
    getAllowedUser.mockResolvedValue({ id: "u1", isAdmin: true });
    listAllowedUsers.mockResolvedValue([]);
    listPendingAccessRequests.mockResolvedValue([]);
    listAllPebbles.mockResolvedValue([]);
    const { default: AdminPage } = await import("./page");

    render(await AdminPage({ searchParams: searchParams("settings") }));

    expect(screen.getByRole("heading", { level: 2, name: /^settings$/i })).toBeInTheDocument();
    expect(screen.getByTestId("manage-feature-flags")).toBeInTheDocument();
    expect(screen.getByTestId("manage-orphan-delay")).toBeInTheDocument();
  });

  it("shows tab navigation to switch between sections", async () => {
    getDynamicFeatureFlags.mockResolvedValue(PHOTOS_ON);
    vi.resetModules();
    getAllowedUser.mockResolvedValue({ id: "u1", isAdmin: true });
    listAllowedUsers.mockResolvedValue([]);
    listPendingAccessRequests.mockResolvedValue([]);
    listAllPebbles.mockResolvedValue([]);
    const { default: AdminPage } = await import("./page");

    render(await AdminPage({ searchParams: searchParams() }));

    const accessTab = screen.getByRole("link", { name: /manage access/i });
    const pebblesTab = screen.getByRole("link", { name: /manage pebbles/i });
    const orphansTab = screen.getByRole("link", { name: /orphaned photos/i });
    const settingsTab = screen.getByRole("link", { name: /^settings$/i });
    expect(accessTab).toHaveAttribute("aria-current", "page");
    expect(pebblesTab).toHaveAttribute("href", "/admin?tab=pebbles");
    expect(orphansTab).toHaveAttribute("href", "/admin?tab=orphans");
    expect(settingsTab).toHaveAttribute("href", "/admin?tab=settings");
  });
});
