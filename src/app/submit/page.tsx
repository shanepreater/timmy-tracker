import { SubmitPebbleForm } from "@/components/SubmitPebbleForm";
import { PageContainer } from "@/components/PageContainer";
import { featureFlags } from "@/lib/feature-flags";

export default function SubmitPage() {
  if (!featureFlags.submitPebble) {
    return (
      <PageContainer>
        <p role="status">Submitting a pebble isn&apos;t open yet — check back soon.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <h1 className="heading-1">Submit a pebble</h1>
        <p className="text-lg leading-8 text-stone-600 dark:text-stone-400">
          Placed one of Tim&apos;s pebbles somewhere? Let us know where and
          when — an admin will review it before it appears on the map.
        </p>
      </div>
      <SubmitPebbleForm />
    </PageContainer>
  );
}
