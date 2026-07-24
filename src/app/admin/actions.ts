"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guards";
import { approveAccessRequest, denyAccessRequest } from "@/lib/access-requests";
import { addAllowedUser, removeAllowedUser, setAllowedUserAdmin } from "@/lib/allowed-users";

export async function approveAccessRequestAction(requestId: string, _formData: FormData) {
  const admin = await requireAdmin();
  await approveAccessRequest(requestId, admin.email);
  revalidatePath("/admin");
}

export async function denyAccessRequestAction(requestId: string, _formData: FormData) {
  const admin = await requireAdmin();
  await denyAccessRequest(requestId, admin.email);
  revalidatePath("/admin");
}

export async function addAllowedUserAction(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;

  await addAllowedUser(email, { isAdmin: formData.get("isAdmin") === "on" });
  revalidatePath("/admin");
}

export async function removeAllowedUserAction(id: string, _formData: FormData) {
  await requireAdmin();
  await removeAllowedUser(id);
  revalidatePath("/admin");
}

export async function toggleAllowedUserAdminAction(
  id: string,
  currentIsAdmin: boolean,
  _formData: FormData,
) {
  await requireAdmin();
  await setAllowedUserAdmin(id, !currentIsAdmin);
  revalidatePath("/admin");
}
