"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guards";
import { featureFlags } from "@/lib/feature-flags";
import { approveAccessRequest, denyAccessRequest } from "@/lib/access-requests";
import { addAllowedUser, removeAllowedUser, setAllowedUserAdmin } from "@/lib/allowed-users";
import {
  createPebbleByAdmin,
  getPebblePhotoUrl,
  movePebble,
  removePebblePhoto,
  verifyPebble,
} from "@/lib/pebbles";
import { deletePebblePhoto, uploadPebblePhoto, validatePebblePhoto } from "@/lib/pebble-photos";
import {
  validateSubmitPebbleInput,
  validateCoordinates,
  type SubmitPebbleFormErrors,
} from "@/lib/pebble-validation";

/**
 * FEATURE_ADMIN gates /admin's existence in the UI (notFound() when
 * off), but server actions are callable independently of that — this
 * is the real kill switch for admin mutations, checked in every action
 * below before requireAdmin() even runs.
 */
function assertAdminFeatureEnabled() {
  if (!featureFlags.admin) {
    throw new Error("The admin section isn't enabled.");
  }
}

function getOptionalPhoto(formData: FormData): File | null {
  const value = formData.get("photo");
  if (!(value instanceof File)) {
    return null;
  }

  if (!value.name || value.size === 0) {
    return null;
  }

  return value;
}

export async function approveAccessRequestAction(requestId: string, _formData: FormData) {
  assertAdminFeatureEnabled();
  const admin = await requireAdmin();
  await approveAccessRequest(requestId, admin.email);
  revalidatePath("/admin");
}

export async function denyAccessRequestAction(requestId: string, _formData: FormData) {
  assertAdminFeatureEnabled();
  const admin = await requireAdmin();
  await denyAccessRequest(requestId, admin.email);
  revalidatePath("/admin");
}

export async function addAllowedUserAction(formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;

  await addAllowedUser(email, { isAdmin: formData.get("isAdmin") === "on" });
  revalidatePath("/admin");
}

export async function removeAllowedUserAction(id: string, _formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();
  await removeAllowedUser(id);
  revalidatePath("/admin");
}

export async function toggleAllowedUserAdminAction(
  id: string,
  currentIsAdmin: boolean,
  _formData: FormData,
) {
  assertAdminFeatureEnabled();
  await requireAdmin();
  await setAllowedUserAdmin(id, !currentIsAdmin);
  revalidatePath("/admin");
}

export type AddPebbleState =
  | { status: "idle" }
  | { status: "error"; errors: SubmitPebbleFormErrors }
  | { status: "success" };

export async function addPebbleAction(
  _prevState: AddPebbleState,
  formData: FormData,
): Promise<AddPebbleState> {
  if (!featureFlags.admin) {
    return { status: "error", errors: { depositedBy: "The admin section isn't enabled." } };
  }
  await requireAdmin();

  const result = validateSubmitPebbleInput({
    latitude: String(formData.get("latitude") ?? ""),
    longitude: String(formData.get("longitude") ?? ""),
    depositedBy: String(formData.get("depositedBy") ?? ""),
    depositedAt: String(formData.get("depositedAt") ?? ""),
  });

  if (result.errors) {
    return { status: "error", errors: result.errors };
  }

  let photoUrl: string | undefined;
  if (featureFlags.pebblePhotos) {
    const photo = getOptionalPhoto(formData);
    if (photo) {
      const validation = validatePebblePhoto(photo);
      if (validation.error) {
        return { status: "error", errors: { photo: validation.error } };
      }

      photoUrl = await uploadPebblePhoto(photo);
    }
  }

  await createPebbleByAdmin(result.data, photoUrl);
  revalidatePath("/admin");
  revalidatePath("/");
  return { status: "success" };
}

export async function verifyPebbleAction(id: string, _formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();
  await verifyPebble(id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function movePebbleAction(id: string, formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();

  const coordinates = validateCoordinates(
    String(formData.get("latitude") ?? ""),
    String(formData.get("longitude") ?? ""),
  );
  if (coordinates.errors) return;

  await movePebble(id, coordinates.latitude, coordinates.longitude);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function removePebblePhotoAction(id: string, _formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();

  if (!featureFlags.pebblePhotos) {
    throw new Error("Pebble photos aren't enabled.");
  }

  const photoUrl = await getPebblePhotoUrl(id);
  if (!photoUrl) {
    return;
  }

  await deletePebblePhoto(photoUrl);
  await removePebblePhoto(id);

  revalidatePath("/admin");
  revalidatePath("/");
}
