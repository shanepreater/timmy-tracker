import { Map } from "@/components/Map";

export default function Home() {
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
      <Map />
    </main>
  );
}
