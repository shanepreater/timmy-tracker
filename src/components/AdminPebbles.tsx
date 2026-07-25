import type { Pebble } from "@prisma/client";
import { verifyPebbleAction, movePebbleAction } from "@/app/admin/actions";
import { formatPebbleDate } from "@/lib/pebbles";
import { AdminAddPebbleForm } from "@/components/AdminAddPebbleForm";

type AdminPebblesProps = {
  pebbles: Pebble[];
};

export function AdminPebbles({ pebbles }: AdminPebblesProps) {
  const pending = pebbles.filter((pebble) => pebble.status === "PENDING");
  const verified = pebbles.filter((pebble) => pebble.status === "VERIFIED");

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold">Pending pebbles</h3>
        {pending.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">No pending submissions.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((pebble) => (
              <li
                key={pebble.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <span>
                  {pebble.depositedBy} — {formatPebbleDate(pebble.depositedAt)} (
                  {pebble.latitude}, {pebble.longitude})
                </span>
                <form action={verifyPebbleAction.bind(null, pebble.id)}>
                  <button type="submit">Verify</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold">Verified pebbles</h3>
        {verified.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">No verified pebbles yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {verified.map((pebble) => (
              <li
                key={pebble.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <span>
                  {pebble.depositedBy} — {formatPebbleDate(pebble.depositedAt)}
                </span>
                <form
                  action={movePebbleAction.bind(null, pebble.id)}
                  className="flex items-center gap-2"
                >
                  <label className="flex items-center gap-1">
                    Lat
                    <input
                      name="latitude"
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                      required
                      defaultValue={pebble.latitude}
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Long
                    <input
                      name="longitude"
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                      required
                      defaultValue={pebble.longitude}
                    />
                  </label>
                  <button type="submit">Save location</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <AdminAddPebbleForm />
      </section>
    </div>
  );
}
