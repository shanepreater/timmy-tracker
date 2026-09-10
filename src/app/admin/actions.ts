"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guards";
import { featureFlags } from "@/lib/feature-flags";
import {
  getDynamicFeatureFlags,
  setDynamicFeatureFlag,
  type DynamicFeatureFlags,
} from "@/lib/dynamic-feature-flags";
import { approveAccessRequest, denyAccessRequest } from "@/lib/access-requests";
import { addAllowedUser, removeAllowedUser, setAllowedUserAdmin } from "@/lib/allowed-users";
import {
  createPebbleByAdmin,
  deletePebble,
  getPebblePhotoUrl,
  movePebble,
  removePebblePhoto,
  verifyPebble,
} from "@/lib/pebbles";
import {
  PhotoValidationError,
  deletePebblePhoto,
  processUploadedPebblePhoto,
  processUploadedPebblePhotos,
} from "@/lib/pebble-photos";
import {
  deleteAllOrphanedPhotoUploads,
  deleteOrphanedPhotoUpload,
  getOrphanMinAgeMinutes,
  setOrphanMinAgeMinutes,
} from "@/lib/pebble-photo-orphans";
import {
  addAdditionalPhotos,
  deleteAdditionalPhotoRow,
  getAdditionalPhotoUrl,
  getMaxAdditionalPhotos,
  listAdditionalPhotos,
  setMaxAdditionalPhotos,
} from "@/lib/pebble-additional-photos";
import {
  validateSubmitPebbleInput,
  validateCoordinates,
  type SubmitPebbleFormErrors,
} from "@/lib/pebble-validation";
import {
  getOptionalRawPhotoUrl,
  getRawAdditionalPhotoUrls,
} from "@/lib/form-helpers";

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

async function assertPebblePhotosEnabled() {
  const { pebblePhotos } = await getDynamicFeatureFlags();
  if (!pebblePhotos) {
    throw new Error("Pebble photos aren't enabled.");
  }
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
  let additionalPhotoUrls: string[] | undefined;
  const { pebblePhotos } = await getDynamicFeatureFlags();
  if (pebblePhotos) {
    const rawPhotoUrl = getOptionalRawPhotoUrl(formData);
    const rawAdditionalPhotoUrls = getRawAdditionalPhotoUrls(formData);

    const maxAdditionalPhotos = await getMaxAdditionalPhotos();
    if (rawAdditionalPhotoUrls.length > maxAdditionalPhotos) {
      return {
        status: "error",
        errors: { photo: `You can add at most ${maxAdditionalPhotos} additional photos.` },
      };
    }

    try {
      if (rawPhotoUrl) {
        photoUrl = await processUploadedPebblePhoto(rawPhotoUrl);
      }
      if (rawAdditionalPhotoUrls.length > 0) {
        additionalPhotoUrls = await processUploadedPebblePhotos(rawAdditionalPhotoUrls);
      }
    } catch (error) {
      if (error instanceof PhotoValidationError) {
        return { status: "error", errors: { photo: error.message } };
      }
      throw error;
    }
  }

  await createPebbleByAdmin(result.data, photoUrl, additionalPhotoUrls);
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
  await assertPebblePhotosEnabled();

  const photoUrl = await getPebblePhotoUrl(id);
  if (!photoUrl) {
    return;
  }

  await deletePebblePhoto(photoUrl);
  await removePebblePhoto(id);

  revalidatePath("/admin");
  revalidatePath("/");
}

/**
 * Permanently removes a pebble (pending or verified), and every photo
 * — primary and additional — from Blob storage. No separate
 * "remove photos first" step required — same reasoning as
 * removePebblePhotoAction's Blob-delete-then-DB-update ordering
 * (docs/design-pebble-photos.md): a failure between these steps just
 * leaves a deleted DB row, not a dangling reference anything renders.
 * The additionalPhotos DB rows cascade on delete, but that only
 * removes the rows — their Blob objects need deleting explicitly here.
 */
export async function deletePebbleAction(id: string, _formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();

  const photoUrl = await getPebblePhotoUrl(id);
  if (photoUrl) {
    await deletePebblePhoto(photoUrl);
  }

  const additionalPhotos = await listAdditionalPhotos(id);
  await Promise.all(additionalPhotos.map((photo) => deletePebblePhoto(photo.url)));

  await deletePebble(id);

  revalidatePath("/admin");
  revalidatePath("/");
}

/**
 * Admin adds more photos to an already-existing pebble (on top of
 * whatever it already has) — the "later" half of additional-photo
 * scope, alongside adding some at creation time in addPebbleAction.
 * Caps to the pebble's *remaining* room, not the full max. Plain
 * bound-arg action (no useActionState wiring, matching
 * updateOrphanMinAgeMinutesAction's precedent) — throws directly on an
 * over-cap submission rather than adding new typed-error plumbing for
 * an admin-only convenience action.
 */
export async function addAdditionalPebblePhotosAction(pebbleId: string, formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();
  await assertPebblePhotosEnabled();

  const rawUrls = getRawAdditionalPhotoUrls(formData);
  if (rawUrls.length === 0) return;

  const [max, existing] = await Promise.all([getMaxAdditionalPhotos(), listAdditionalPhotos(pebbleId)]);
  const room = Math.max(max - existing.length, 0);
  if (rawUrls.length > room) {
    throw new Error(`You can add at most ${room} more photo(s) to this pebble.`);
  }

  const processedUrls = await processUploadedPebblePhotos(rawUrls);
  await addAdditionalPhotos(pebbleId, processedUrls);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function removeAdditionalPebblePhotoAction(photoId: string, _formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();
  await assertPebblePhotosEnabled();

  const url = await getAdditionalPhotoUrl(photoId);
  if (!url) return;

  await deletePebblePhoto(url);
  await deleteAdditionalPhotoRow(photoId);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateMaxAdditionalPhotosAction(formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();

  const count = Number(formData.get("maxCount"));
  if (!Number.isFinite(count) || count < 0) {
    throw new Error("Enter a non-negative number of photos.");
  }

  await setMaxAdditionalPhotos(count);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/submit");
}

export async function deleteOrphanedPhotoUploadAction(url: string, _formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();
  await assertPebblePhotosEnabled();

  await deleteOrphanedPhotoUpload(url);
  revalidatePath("/admin");
}

export async function deleteAllOrphanedPhotoUploadsAction(_formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();
  await assertPebblePhotosEnabled();

  const minAgeMinutes = await getOrphanMinAgeMinutes();
  await deleteAllOrphanedPhotoUploads(minAgeMinutes);
  revalidatePath("/admin");
}

const DYNAMIC_FLAG_KEYS: readonly (keyof DynamicFeatureFlags)[] = [
  "map",
  "submitPebble",
  "pebblePhotos",
];

/** Same toggle-the-opposite-of-current-value shape as toggleAllowedUserAdminAction. */
export async function updateFeatureFlagAction(
  key: keyof DynamicFeatureFlags,
  currentValue: boolean,
  _formData: FormData,
) {
  assertAdminFeatureEnabled();
  await requireAdmin();

  if (!DYNAMIC_FLAG_KEYS.includes(key)) {
    throw new Error("Unknown feature flag.");
  }

  await setDynamicFeatureFlag(key, !currentValue);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/submit");
}

export async function updateOrphanMinAgeMinutesAction(formData: FormData) {
  assertAdminFeatureEnabled();
  await requireAdmin();
  await assertPebblePhotosEnabled();

  const minutes = Number(formData.get("minAgeMinutes"));
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error("Enter a non-negative number of minutes.");
  }

  await setOrphanMinAgeMinutes(minutes);
  revalidatePath("/admin");
}
