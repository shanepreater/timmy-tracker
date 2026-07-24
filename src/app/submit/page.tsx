import { SubmitPebbleForm } from "@/components/SubmitPebbleForm";
import { featureFlags } from "@/lib/feature-flags";

export default function SubmitPage() {
  if (!featureFlags.submitPebble) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
        <p role="status">Submitting a pebble isn&apos;t open yet — check back soon.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Submit a pebble</h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Placed one of Tim&apos;s pebbles somewhere? Let us know where and
          when — an admin will review it before it appears on the map.
        </p>
      </div>
      <SubmitPebbleForm />
    </main>
  );
}
