import type { OrphanedPhotoUpload } from "@/lib/pebble-photo-orphans";
import {
  deleteOrphanedPhotoUploadAction,
  deleteAllOrphanedPhotoUploadsAction,
} from "@/app/admin/actions";
import { Button } from "@/components/Button";
import { ConfirmForm } from "@/components/ConfirmForm";

type ManageOrphanedPhotosProps = {
  orphans: OrphanedPhotoUpload[];
};

function formatSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/**
 * A byproduct of PebblePhotoField uploading as soon as a photo is
 * selected rather than on submit (docs/design-pebble-photos.md's
 * client-upload amendment) — an abandoned form leaves the raw upload
 * behind with nothing to ever process or delete it. Only uploads older
 * than an hour show up here (see pebble-photo-orphans.ts), so a submission
 * still in progress never gets swept mid-fill.
 */
export function ManageOrphanedPhotos({ orphans }: ManageOrphanedPhotosProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Photos uploaded to a submit/add-pebble form that was never completed, at least an hour
        ago (a form still being filled in doesn&rsquo;t show here). Safe to delete — none of these
        are attached to any pebble.
      </p>
      {orphans.length === 0 ? (
        <p className="text-stone-600 dark:text-stone-400">No orphaned uploads.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {orphans.map((orphan) => (
              <li key={orphan.url} className="card flex items-center justify-between gap-4">
                <span className="text-sm">
                  {orphan.pathname} — {formatSize(orphan.size)}, uploaded{" "}
                  {orphan.uploadedAt.toLocaleDateString()}
                </span>
                <ConfirmForm
                  action={deleteOrphanedPhotoUploadAction.bind(null, orphan.url)}
                  confirmMessage={`Delete orphaned upload "${orphan.pathname}"?`}
                >
                  <Button type="submit" variant="danger">
                    Delete
                  </Button>
                </ConfirmForm>
              </li>
            ))}
          </ul>
          <ConfirmForm
            action={deleteAllOrphanedPhotoUploadsAction}
            confirmMessage={`Delete all ${orphans.length} orphaned upload${orphans.length === 1 ? "" : "s"}?`}
            className="self-start"
          >
            <Button type="submit" variant="danger">
              Delete all
            </Button>
          </ConfirmForm>
        </>
      )}
    </div>
  );
}
