import { Map } from "@/components/Map";
import { featureFlags } from "@/lib/feature-flags";
import { getVerifiedPebbles } from "@/lib/pebbles";

// Pebble data changes whenever an admin verifies a submission, so this
// page shouldn't be statically cached at build time (and a build with no
// DATABASE_URL, e.g. before local Postgres is set up, still succeeds).
export const dynamic = "force-dynamic";

export default async function Home() {
  // Skip the query entirely while the map is flagged off, so the site
  // doesn't need a working Postgres connection just to load the home page.
  const pebbles = featureFlags.map ? await getVerifiedPebbles() : [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Timmy Tracker
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          In memory of Tim, this map tracks where the stones carrying his
          ashes have been placed by the people who loved him.
        </p>
      </div>
      <Map pebbles={pebbles} />
    </main>
  );
}
