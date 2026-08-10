import { SubmitPebbleForm } from "@/components/SubmitPebbleForm";
import { PageContainer } from "@/components/PageContainer";
import { FeatureFlagsProvider } from "@/components/FeatureFlagsProvider";
import { getDynamicFeatureFlags } from "@/lib/dynamic-feature-flags";
import { getMaxAdditionalPhotos } from "@/lib/pebble-additional-photos";

// Flags are DB-backed now (admin-toggleable without a redeploy) — this
// needs to be read fresh per request, not baked in at build time. Same
// reasoning as src/app/admin/page.tsx's force-dynamic.
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const flags = await getDynamicFeatureFlags();
  const maxAdditionalPhotos = await getMaxAdditionalPhotos();

  if (!flags.submitPebble) {
    return (
      <PageContainer>
        <p role="status">Submitting a pebble isn&apos;t open yet — check back soon.</p>
      </PageContainer>
    );
  }

  return (
    <FeatureFlagsProvider flags={flags}>
      <PageContainer>
        <div className="flex flex-col gap-4">
          <h1 className="heading-1">Submit a pebble</h1>
          <p className="text-lg leading-8 text-stone-600 dark:text-stone-400">
            Placed one of Tim&apos;s pebbles somewhere? Let us know where and
            when — an admin will review it before it appears on the map.
          </p>
        </div>
        <SubmitPebbleForm maxAdditionalPhotos={maxAdditionalPhotos} />
      </PageContainer>
    </FeatureFlagsProvider>
  );
}
