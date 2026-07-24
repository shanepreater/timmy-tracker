"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guards";
import { featureFlags } from "@/lib/feature-flags";
import { approveAccessRequest, denyAccessRequest } from "@/lib/access-requests";
import { addAllowedUser, removeAllowedUser, setAllowedUserAdmin } from "@/lib/allowed-users";

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
