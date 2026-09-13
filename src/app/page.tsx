import dynamicImport from "next/dynamic";
import { ButtonLink } from "@/components/ButtonLink";
import { PageContainer } from "@/components/PageContainer";
import { FeatureFlagsProvider } from "@/components/FeatureFlagsProvider";
import { MapPlaceholder } from "@/components/MapPlaceholder";
import { getDynamicFeatureFlags } from "@/lib/dynamic-feature-flags";
import { getVerifiedPebbles } from "@/lib/pebbles";

// Pebble data changes whenever an admin verifies a submission, so this
// page shouldn't be statically cached at build time (and a build with no
// DATABASE_URL, e.g. before local Postgres is set up, still succeeds).
export const dynamic = "force-dynamic";

const Map = dynamicImport(
  () => import("@/components/Map").then((mod) => mod.Map),
  {
    loading: () => <MapPlaceholder />,
  }
);

export default async function Home() {
  const flags = await getDynamicFeatureFlags();
  // Skip the query entirely while the map is flagged off, so the site
  // doesn't need a working Postgres connection just to load the home page.
  const pebbles = flags.map ? await getVerifiedPebbles() : [];

  return (
    <FeatureFlagsProvider flags={flags}>
      <PageContainer maxWidth="6xl">
        <div className="flex flex-col gap-4">
          <h1 className="heading-1">Timmy Tracker</h1>
          <p className="text-lg leading-8 text-stone-600 dark:text-stone-400">
            In memory of Tim, this map tracks where the stones carrying his
            ashes have been placed by the people who loved him.
          </p>
          {flags.submitPebble && (
            <ButtonLink href="/submit" className="self-start">
              Submit a pebble
            </ButtonLink>
          )}
        </div>
        <Map pebbles={pebbles} />
      </PageContainer>
    </FeatureFlagsProvider>
  );
}
