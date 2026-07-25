import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const approveAccessRequest = vi.fn();
const denyAccessRequest = vi.fn();
const addAllowedUser = vi.fn();
const removeAllowedUser = vi.fn();
const setAllowedUserAdmin = vi.fn();
const createPebbleByAdmin = vi.fn();
const getPebblePhotoUrl = vi.fn();
const removePebblePhoto = vi.fn();
const verifyPebble = vi.fn();
const movePebble = vi.fn();
const deletePebblePhoto = vi.fn();
const uploadPebblePhoto = vi.fn();
const validatePebblePhoto = vi.fn();
const revalidatePath = vi.fn();
class FakePhotoValidationError extends Error {}

vi.mock("@/lib/auth-guards", () => ({ requireAdmin }));
vi.mock("@/lib/access-requests", () => ({ approveAccessRequest, denyAccessRequest }));
vi.mock("@/lib/allowed-users", () => ({
  addAllowedUser,
  removeAllowedUser,
  setAllowedUserAdmin,
}));
vi.mock("@/lib/pebbles", () => ({
  createPebbleByAdmin,
  getPebblePhotoUrl,
  removePebblePhoto,
  verifyPebble,
  movePebble,
}));
vi.mock("@/lib/pebble-photos", () => ({
  deletePebblePhoto,
  uploadPebblePhoto,
  validatePebblePhoto,
  PhotoValidationError: FakePhotoValidationError,
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
  addPebbleAction,
  verifyPebbleAction,
  movePebbleAction,
  removePebblePhotoAction,
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
  getPebblePhotoUrl.mockReset();
  getPebblePhotoUrl.mockResolvedValue(null);
  removePebblePhoto.mockReset();
  removePebblePhoto.mockResolvedValue(undefined);
  verifyPebble.mockReset();
  movePebble.mockReset();
  deletePebblePhoto.mockReset();
  deletePebblePhoto.mockResolvedValue(undefined);
  uploadPebblePhoto.mockReset();
  uploadPebblePhoto.mockResolvedValue("https://blob.example/photo.webp");
  validatePebblePhoto.mockReset();
  validatePebblePhoto.mockReturnValue({});
  revalidatePath.mockReset();
  vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "");
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
    }, undefined);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("uploads a provided photo and stores its URL", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "true");
    vi.resetModules();
    const { addPebbleAction: addPebbleActionWithPhotos } = await import("./actions");

    const data = formData(VALID_PEBBLE_FIELDS);
    const file = new File([new Uint8Array([1, 2, 3])], "tim.jpg", { type: "image/jpeg" });
    data.set("photo", file);

    const result = await addPebbleActionWithPhotos({ status: "idle" }, data);

    expect(result).toEqual({ status: "success" });
    expect(validatePebblePhoto).toHaveBeenCalledWith(file);
    expect(uploadPebblePhoto).toHaveBeenCalledWith(file);
    expect(createPebbleByAdmin).toHaveBeenCalledWith(
      {
        latitude: 48.8584,
        longitude: 2.2945,
        depositedBy: "Sarah",
        depositedAt: new Date("2026-03-01"),
      },
      "https://blob.example/photo.webp",
    );
  });

  it("returns a photo error when photo validation fails", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "true");
    vi.resetModules();
    validatePebblePhoto.mockReturnValue({ error: "Photo must be 8 MB or smaller." });
    const { addPebbleAction: addPebbleActionWithPhotos } = await import("./actions");

    const data = formData(VALID_PEBBLE_FIELDS);
    data.set("photo", new File([new Uint8Array([1])], "tim.jpg", { type: "image/jpeg" }));

    const result = await addPebbleActionWithPhotos({ status: "idle" }, data);

    expect(result).toEqual({
      status: "error",
      errors: { photo: "Photo must be 8 MB or smaller." },
    });
    expect(uploadPebblePhoto).not.toHaveBeenCalled();
    expect(createPebbleByAdmin).not.toHaveBeenCalled();
  });

  it("returns a photo error when upload throws PhotoValidationError", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "true");
    vi.resetModules();
    uploadPebblePhoto.mockRejectedValue(
      new FakePhotoValidationError("We couldn't process that image. Try a different file."),
    );
    const { addPebbleAction: addPebbleActionWithPhotos } = await import("./actions");

    const data = formData(VALID_PEBBLE_FIELDS);
    data.set("photo", new File([new Uint8Array([1, 2, 3])], "tim.jpg", { type: "image/jpeg" }));

    const result = await addPebbleActionWithPhotos({ status: "idle" }, data);

    expect(result).toEqual({
      status: "error",
      errors: { photo: "We couldn't process that image. Try a different file." },
    });
    expect(createPebbleByAdmin).not.toHaveBeenCalled();
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

describe("removePebblePhotoAction", () => {
  it("throws when FEATURE_ADMIN is off", async () => {
    vi.stubEnv("FEATURE_ADMIN", "");
    vi.resetModules();
    const disabled = await import("./actions");

    await expect(disabled.removePebblePhotoAction("p1", formData())).rejects.toThrow(
      "isn't enabled",
    );
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it("throws when pebble photos are disabled", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });

    await expect(removePebblePhotoAction("p1", formData())).rejects.toThrow(
      "Pebble photos aren't enabled.",
    );
    expect(getPebblePhotoUrl).not.toHaveBeenCalled();
  });

  it("no-ops when the pebble has no photo", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });
    vi.stubEnv("FEATURE_ADMIN", "true");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "true");
    vi.resetModules();
    const { removePebblePhotoAction: removeWithPhotos } = await import("./actions");

    await removeWithPhotos("p1", formData());

    expect(getPebblePhotoUrl).toHaveBeenCalledWith("p1");
    expect(deletePebblePhoto).not.toHaveBeenCalled();
    expect(removePebblePhoto).not.toHaveBeenCalled();
  });

  it("deletes blob then clears DB photoUrl and revalidates", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });
    getPebblePhotoUrl.mockResolvedValue("https://blob.example/photo.webp");
    vi.stubEnv("FEATURE_ADMIN", "true");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "true");
    vi.resetModules();
    const { removePebblePhotoAction: removeWithPhotos } = await import("./actions");

    await removeWithPhotos("p1", formData());

    expect(deletePebblePhoto).toHaveBeenCalledWith("https://blob.example/photo.webp");
    expect(removePebblePhoto).toHaveBeenCalledWith("p1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});
