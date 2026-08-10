import { notFound, redirect } from "next/navigation";
import { featureFlags } from "@/lib/feature-flags";
import { getDynamicFeatureFlags } from "@/lib/dynamic-feature-flags";
import { getAllowedUser } from "@/lib/auth-guards";
import { listAllowedUsers } from "@/lib/allowed-users";
import { listPendingAccessRequests } from "@/lib/access-requests";
import { listAllPebbles } from "@/lib/pebbles";
import { getOrphanMinAgeMinutes, listOrphanedPhotoUploads } from "@/lib/pebble-photo-orphans";
import { getMaxAdditionalPhotos } from "@/lib/pebble-additional-photos";
import { ManageUsers } from "@/components/ManageUsers";
import { AdminPebbles } from "@/components/AdminPebbles";
import { ManageOrphanedPhotos } from "@/components/ManageOrphanedPhotos";
import { ManageFeatureFlags } from "@/components/ManageFeatureFlags";
import { ManageOrphanDelay } from "@/components/ManageOrphanDelay";
import { ManageMaxAdditionalPhotos } from "@/components/ManageMaxAdditionalPhotos";
import { FeatureFlagsProvider } from "@/components/FeatureFlagsProvider";
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

  const flags = await getDynamicFeatureFlags();
  const orphanMinAgeMinutes = await getOrphanMinAgeMinutes();
  const maxAdditionalPhotos = await getMaxAdditionalPhotos();

  const { tab } = await searchParams;
  const activeTab: AdminTab =
    tab === "pebbles"
      ? "pebbles"
      : tab === "settings"
        ? "settings"
        : tab === "orphans" && flags.pebblePhotos
          ? "orphans"
          : "access";

  const [allowedUsers, pendingRequests, pebbles, orphanedUploads] = await Promise.all([
    listAllowedUsers(),
    listPendingAccessRequests(),
    listAllPebbles(),
    flags.pebblePhotos
      ? listOrphanedPhotoUploads(orphanMinAgeMinutes)
      : Promise.resolve([]),
  ]);

  return (
    <FeatureFlagsProvider flags={flags}>
      <PageContainer maxWidth="4xl">
        <h1 className="heading-1">Admin</h1>
        <AdminTabs active={activeTab} showOrphans={flags.pebblePhotos} />
        {activeTab === "access" ? (
          <div className="flex flex-col gap-8">
            <h2 className="heading-2">Manage access</h2>
            <ManageUsers allowedUsers={allowedUsers} pendingRequests={pendingRequests} />
          </div>
        ) : activeTab === "pebbles" ? (
          <div className="flex flex-col gap-8">
            <h2 className="heading-2">Manage pebbles</h2>
            <AdminPebbles
              pebbles={pebbles}
              pebblePhotosEnabled={flags.pebblePhotos}
              maxAdditionalPhotos={maxAdditionalPhotos}
            />
          </div>
        ) : activeTab === "orphans" ? (
          <div className="flex flex-col gap-8">
            <h2 className="heading-2">Orphaned photo uploads</h2>
            <ManageOrphanedPhotos orphans={orphanedUploads} />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <h2 className="heading-2">Settings</h2>
            <ManageFeatureFlags flags={flags} />
            <ManageOrphanDelay minAgeMinutes={orphanMinAgeMinutes} />
            <ManageMaxAdditionalPhotos maxCount={maxAdditionalPhotos} />
          </div>
        )}
      </PageContainer>
    </FeatureFlagsProvider>
  );
}
