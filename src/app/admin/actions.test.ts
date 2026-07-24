import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const approveAccessRequest = vi.fn();
const denyAccessRequest = vi.fn();
const addAllowedUser = vi.fn();
const removeAllowedUser = vi.fn();
const setAllowedUserAdmin = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/auth-guards", () => ({ requireAdmin }));
vi.mock("@/lib/access-requests", () => ({ approveAccessRequest, denyAccessRequest }));
vi.mock("@/lib/allowed-users", () => ({
  addAllowedUser,
  removeAllowedUser,
  setAllowedUserAdmin,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

// Stubbed before the static import below, so featureFlags.admin is
// "true" for every test in this file except the dedicated flag-off
// block, which re-imports the module with its own stub.
vi.stubEnv("FEATURE_ADMIN", "true");

const {
  approveAccessRequestAction,
  denyAccessRequestAction,
  addAllowedUserAction,
  removeAllowedUserAction,
  toggleAllowedUserAdminAction,
} = await import("./actions");

beforeEach(() => {
  requireAdmin.mockReset();
  approveAccessRequest.mockReset();
  denyAccessRequest.mockReset();
  addAllowedUser.mockReset();
  removeAllowedUser.mockReset();
  setAllowedUserAdmin.mockReset();
  revalidatePath.mockReset();
});

function formData(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("admin actions require admin", () => {
  it("approveAccessRequestAction rejects when requireAdmin throws", async () => {
    requireAdmin.mockRejectedValue(new Error("Admin access required."));

    await expect(approveAccessRequestAction("r1", formData())).rejects.toThrow(
      "Admin access required.",
    );
    expect(approveAccessRequest).not.toHaveBeenCalled();
  });
});

describe("admin actions require FEATURE_ADMIN", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv("FEATURE_ADMIN", "true");
  });

  it("every action throws without calling requireAdmin when the flag is off", async () => {
    vi.stubEnv("FEATURE_ADMIN", "");
    vi.resetModules();
    const disabled = await import("./actions");

    await expect(disabled.approveAccessRequestAction("r1", formData())).rejects.toThrow(
      "isn't enabled",
    );
    await expect(disabled.denyAccessRequestAction("r1", formData())).rejects.toThrow(
      "isn't enabled",
    );
    await expect(disabled.addAllowedUserAction(formData({ email: "x@example.com" }))).rejects.toThrow(
      "isn't enabled",
    );
    await expect(disabled.removeAllowedUserAction("u1", formData())).rejects.toThrow(
      "isn't enabled",
    );
    await expect(
      disabled.toggleAllowedUserAdminAction("u1", false, formData()),
    ).rejects.toThrow("isn't enabled");

    expect(requireAdmin).not.toHaveBeenCalled();
  });
});

describe("approveAccessRequestAction", () => {
  it("approves using the admin's email and revalidates", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await approveAccessRequestAction("r1", formData());

    expect(approveAccessRequest).toHaveBeenCalledWith("r1", "admin@example.com");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("denyAccessRequestAction", () => {
  it("denies using the admin's email and revalidates", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await denyAccessRequestAction("r1", formData());

    expect(denyAccessRequest).toHaveBeenCalledWith("r1", "admin@example.com");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("addAllowedUserAction", () => {
  it("adds the user from form data and revalidates", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await addAllowedUserAction(formData({ email: "new@example.com", isAdmin: "on" }));

    expect(addAllowedUser).toHaveBeenCalledWith("new@example.com", { isAdmin: true });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("does nothing when email is blank", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await addAllowedUserAction(formData({ email: "  " }));

    expect(addAllowedUser).not.toHaveBeenCalled();
  });
});

describe("removeAllowedUserAction", () => {
  it("removes by id and revalidates", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await removeAllowedUserAction("u1", formData());

    expect(removeAllowedUser).toHaveBeenCalledWith("u1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("toggleAllowedUserAdminAction", () => {
  it("flips isAdmin and revalidates", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await toggleAllowedUserAdminAction("u1", true, formData());

    expect(setAllowedUserAdmin).toHaveBeenCalledWith("u1", false);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });
});
