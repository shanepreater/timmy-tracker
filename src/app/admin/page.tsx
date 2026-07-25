import { notFound, redirect } from "next/navigation";
import { featureFlags } from "@/lib/feature-flags";
import { getAllowedUser } from "@/lib/auth-guards";
import { listAllowedUsers } from "@/lib/allowed-users";
import { listPendingAccessRequests } from "@/lib/access-requests";
import { listAllPebbles } from "@/lib/pebbles";
import { ManageUsers } from "@/components/ManageUsers";
import { AdminPebbles } from "@/components/AdminPebbles";
import { PageContainer } from "@/components/PageContainer";
import { AdminTabs, type AdminTab } from "@/components/AdminTabs";

// Session/whitelist-dependent on every request, and featureFlags.admin
// needs to be re-checked per request too — without this, a build where
// the flag was off at build time would statically bake in notFound()
// forever, the same gotcha src/app/page.tsx already works around.
export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!featureFlags.admin) {
    notFound();
  }

  const user = await getAllowedUser();
  if (!user?.isAdmin) {
    redirect("/");
  }

  const { tab } = await searchParams;
  const activeTab: AdminTab = tab === "pebbles" ? "pebbles" : "access";

  const [allowedUsers, pendingRequests, pebbles] = await Promise.all([
    listAllowedUsers(),
    listPendingAccessRequests(),
    listAllPebbles(),
  ]);

  return (
    <PageContainer maxWidth="4xl">
      <h1 className="heading-1">Admin</h1>
      <AdminTabs active={activeTab} />
      {activeTab === "access" ? (
        <div className="flex flex-col gap-8">
          <h2 className="heading-2">Manage access</h2>
          <ManageUsers allowedUsers={allowedUsers} pendingRequests={pendingRequests} />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <h2 className="heading-2">Manage pebbles</h2>
          <AdminPebbles pebbles={pebbles} />
        </div>
      )}
    </PageContainer>
  );
}
