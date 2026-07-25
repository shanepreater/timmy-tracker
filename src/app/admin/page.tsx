import { notFound, redirect } from "next/navigation";
import { featureFlags } from "@/lib/feature-flags";
import { getAllowedUser } from "@/lib/auth-guards";
import { listAllowedUsers } from "@/lib/allowed-users";
import { listPendingAccessRequests } from "@/lib/access-requests";
import { listAllPebbles } from "@/lib/pebbles";
import { ManageUsers } from "@/components/ManageUsers";
import { AdminPebbles } from "@/components/AdminPebbles";

// Session/whitelist-dependent on every request, and featureFlags.admin
// needs to be re-checked per request too — without this, a build where
// the flag was off at build time would statically bake in notFound()
// forever, the same gotcha src/app/page.tsx already works around.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!featureFlags.admin) {
    notFound();
  }

  const user = await getAllowedUser();
  if (!user?.isAdmin) {
    redirect("/");
  }

  const [allowedUsers, pendingRequests, pebbles] = await Promise.all([
    listAllowedUsers(),
    listPendingAccessRequests(),
    listAllPebbles(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-16 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <div className="flex flex-col gap-8">
        <h2 className="text-2xl font-semibold tracking-tight">Manage access</h2>
        <ManageUsers allowedUsers={allowedUsers} pendingRequests={pendingRequests} />
      </div>
      <div className="flex flex-col gap-8">
        <h2 className="text-2xl font-semibold tracking-tight">Manage pebbles</h2>
        <AdminPebbles pebbles={pebbles} />
      </div>
    </main>
  );
}
