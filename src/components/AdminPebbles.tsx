import { formatPebbleDate, type PebbleWithPhotos } from "@/lib/pebbles";
import {
  removePebblePhotoAction,
  verifyPebbleAction,
  movePebbleAction,
  deletePebbleAction,
} from "@/app/admin/actions";
import { AdminAddPebbleForm } from "@/components/AdminAddPebbleForm";
import { AdminAdditionalPhotos } from "@/components/AdminAdditionalPhotos";
import { Button } from "@/components/Button";
import { ConfirmForm } from "@/components/ConfirmForm";
import { PebblePhoto } from "@/components/PebblePhoto";

function deleteConfirmMessage(pebble: PebbleWithPhotos): string {
  return `Delete the pebble for ${pebble.depositedBy} (${formatPebbleDate(pebble.depositedAt)})? This can't be undone.`;
}

type AdminPebblesProps = {
  pebbles: PebbleWithPhotos[];
  pebblePhotosEnabled: boolean;
  maxAdditionalPhotos: number;
};

export function AdminPebbles({ pebbles, pebblePhotosEnabled, maxAdditionalPhotos }: AdminPebblesProps) {
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
              <li key={pebble.id} className="card flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
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
                          Remove primary photo
                        </Button>
                      </form>
                    )}
                    <form action={verifyPebbleAction.bind(null, pebble.id)}>
                      <Button type="submit">Verify</Button>
                    </form>
                    <ConfirmForm
                      action={deletePebbleAction.bind(null, pebble.id)}
                      confirmMessage={deleteConfirmMessage(pebble)}
                    >
                      <Button type="submit" variant="danger">
                        Delete
                      </Button>
                    </ConfirmForm>
                  </div>
                </div>
                {pebblePhotosEnabled && (
                  <AdminAdditionalPhotos
                    pebbleId={pebble.id}
                    photos={pebble.additionalPhotos}
                    max={maxAdditionalPhotos}
                  />
                )}
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
                  <div className="flex items-center gap-2">
                    {pebblePhotosEnabled && pebble.photoUrl && (
                      <form action={removePebblePhotoAction.bind(null, pebble.id)}>
                        <Button type="submit" variant="secondary">
                          Remove primary photo
                        </Button>
                      </form>
                    )}
                    <ConfirmForm
                      action={deletePebbleAction.bind(null, pebble.id)}
                      confirmMessage={deleteConfirmMessage(pebble)}
                    >
                      <Button type="submit" variant="danger">
                        Delete
                      </Button>
                    </ConfirmForm>
                  </div>
                </div>
                {pebblePhotosEnabled && (
                  <AdminAdditionalPhotos
                    pebbleId={pebble.id}
                    photos={pebble.additionalPhotos}
                    max={maxAdditionalPhotos}
                  />
                )}
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
        <AdminAddPebbleForm maxAdditionalPhotos={maxAdditionalPhotos} />
      </section>
    </div>
  );
}
