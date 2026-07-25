import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const approveAccessRequest = vi.fn();
const denyAccessRequest = vi.fn();
const addAllowedUser = vi.fn();
const removeAllowedUser = vi.fn();
const setAllowedUserAdmin = vi.fn();
const createPebbleByAdmin = vi.fn();
const verifyPebble = vi.fn();
const movePebble = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/auth-guards", () => ({ requireAdmin }));
vi.mock("@/lib/access-requests", () => ({ approveAccessRequest, denyAccessRequest }));
vi.mock("@/lib/allowed-users", () => ({
  addAllowedUser,
  removeAllowedUser,
  setAllowedUserAdmin,
}));
vi.mock("@/lib/pebbles", () => ({ createPebbleByAdmin, verifyPebble, movePebble }));
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
  addPebbleAction,
  verifyPebbleAction,
  movePebbleAction,
} = await import("./actions");

const VALID_PEBBLE_FIELDS = {
  latitude: "48.8584",
  longitude: "2.2945",
  depositedBy: "Sarah",
  depositedAt: "2026-03-01",
};

beforeEach(() => {
  requireAdmin.mockReset();
  approveAccessRequest.mockReset();
  denyAccessRequest.mockReset();
  addAllowedUser.mockReset();
  removeAllowedUser.mockReset();
  setAllowedUserAdmin.mockReset();
  createPebbleByAdmin.mockReset();
  verifyPebble.mockReset();
  movePebble.mockReset();
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
    await expect(disabled.verifyPebbleAction("p1", formData())).rejects.toThrow(
      "isn't enabled",
    );
    await expect(
      disabled.movePebbleAction("p1", formData({ latitude: "1", longitude: "2" })),
    ).rejects.toThrow("isn't enabled");

    const addPebbleResult = await disabled.addPebbleAction(
      { status: "idle" },
      formData(VALID_PEBBLE_FIELDS),
    );
    expect(addPebbleResult.status).toBe("error");
    expect(createPebbleByAdmin).not.toHaveBeenCalled();

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

describe("addPebbleAction", () => {
  it("rejects when requireAdmin throws, without creating a pebble", async () => {
    requireAdmin.mockRejectedValue(new Error("Admin access required."));

    await expect(
      addPebbleAction({ status: "idle" }, formData(VALID_PEBBLE_FIELDS)),
    ).rejects.toThrow("Admin access required.");
    expect(createPebbleByAdmin).not.toHaveBeenCalled();
  });

  it("creates the pebble and revalidates both / and /admin on success", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    const result = await addPebbleAction({ status: "idle" }, formData(VALID_PEBBLE_FIELDS));

    expect(result).toEqual({ status: "success" });
    expect(createPebbleByAdmin).toHaveBeenCalledWith({
      latitude: 48.8584,
      longitude: 2.2945,
      depositedBy: "Sarah",
      depositedAt: new Date("2026-03-01"),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("returns field errors and doesn't create a pebble on invalid input", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    const result = await addPebbleAction(
      { status: "idle" },
      formData({ ...VALID_PEBBLE_FIELDS, latitude: "not-a-number" }),
    );

    expect(result).toEqual({
      status: "error",
      errors: { latitude: "Enter a latitude between -90 and 90." },
    });
    expect(createPebbleByAdmin).not.toHaveBeenCalled();
  });
});

describe("verifyPebbleAction", () => {
  it("verifies by id and revalidates both / and /admin", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await verifyPebbleAction("p1", formData());

    expect(verifyPebble).toHaveBeenCalledWith("p1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("movePebbleAction", () => {
  it("moves to the new coordinates and revalidates both / and /admin", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await movePebbleAction("p1", formData({ latitude: "10", longitude: "20" }));

    expect(movePebble).toHaveBeenCalledWith("p1", 10, 20);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("does nothing on invalid coordinates", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await movePebbleAction("p1", formData({ latitude: "not-a-number", longitude: "20" }));

    expect(movePebble).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
