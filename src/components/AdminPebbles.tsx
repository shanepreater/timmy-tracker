import type { Pebble } from "@prisma/client";
import { removePebblePhotoAction, verifyPebbleAction, movePebbleAction } from "@/app/admin/actions";
import { formatPebbleDate } from "@/lib/pebbles";
import { AdminAddPebbleForm } from "@/components/AdminAddPebbleForm";
import { Button } from "@/components/Button";
import { PebblePhoto } from "@/components/PebblePhoto";

type AdminPebblesProps = {
  pebbles: Pebble[];
};

export function AdminPebbles({ pebbles }: AdminPebblesProps) {
  const pebblePhotosEnabled = process.env.NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS === "true";
  const pending = pebbles.filter((pebble) => pebble.status === "PENDING");
  const verified = pebbles.filter((pebble) => pebble.status === "VERIFIED");

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h3 className="heading-3">Pending pebbles</h3>
        {pending.length === 0 ? (
          <p className="text-stone-600 dark:text-stone-400">No pending submissions.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((pebble) => (
              <li key={pebble.id} className="card flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {pebblePhotosEnabled && pebble.photoUrl && (
                    <PebblePhoto
                      src={pebble.photoUrl}
                      alt={`Photo for ${pebble.depositedBy}`}
                      className="h-14 w-14"
                    />
                  )}
                  <span>
                    {pebble.depositedBy} — {formatPebbleDate(pebble.depositedAt)} (
                    {pebble.latitude}, {pebble.longitude})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {pebblePhotosEnabled && pebble.photoUrl && (
                    <form action={removePebblePhotoAction.bind(null, pebble.id)}>
                      <Button type="submit" variant="secondary">
                        Remove photo
                      </Button>
                    </form>
                  )}
                  <form action={verifyPebbleAction.bind(null, pebble.id)}>
                    <Button type="submit">Verify</Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="heading-3">Verified pebbles</h3>
        {verified.length === 0 ? (
          <p className="text-stone-600 dark:text-stone-400">No verified pebbles yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {verified.map((pebble) => (
              <li key={pebble.id} className="card flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {pebblePhotosEnabled && pebble.photoUrl && (
                      <PebblePhoto
                        src={pebble.photoUrl}
                        alt={`Photo for ${pebble.depositedBy}`}
                        className="h-14 w-14"
                      />
                    )}
                    <span>
                      {pebble.depositedBy} — {formatPebbleDate(pebble.depositedAt)}
                    </span>
                  </div>
                  {pebblePhotosEnabled && pebble.photoUrl && (
                    <form action={removePebblePhotoAction.bind(null, pebble.id)}>
                      <Button type="submit" variant="secondary">
                        Remove photo
                      </Button>
                    </form>
                  )}
                </div>
                <form
                  action={movePebbleAction.bind(null, pebble.id)}
                  className="flex items-center gap-2"
                >
                  <label className="flex items-center gap-1 text-sm text-stone-700 dark:text-stone-300">
                    Lat
                    <input
                      name="latitude"
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                      required
                      defaultValue={pebble.latitude}
                      className="input w-28"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-sm text-stone-700 dark:text-stone-300">
                    Long
                    <input
                      name="longitude"
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                      required
                      defaultValue={pebble.longitude}
                      className="input w-28"
                    />
                  </label>
                  <Button type="submit" variant="secondary">
                    Save location
                  </Button>
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
