"use client";

import { useState } from "react";
import type { PebbleAdditionalPhotoRecord } from "@/lib/pebble-additional-photos";
import {
  addAdditionalPebblePhotosAction,
  removeAdditionalPebblePhotoAction,
} from "@/app/admin/actions";
import { PebblePhoto } from "@/components/PebblePhoto";
import { AdditionalPebblePhotosField } from "@/components/AdditionalPebblePhotosField";
import { Button } from "@/components/Button";
import { ConfirmForm } from "@/components/ConfirmForm";

type AdminAdditionalPhotosProps = {
  pebbleId: string;
  photos: PebbleAdditionalPhotoRecord[];
  /** Site-wide max — the field below is offered whatever room remains for this pebble specifically. */
  max: number;
};

/**
 * Per-pebble additional-photo management for AdminPebbles: existing
 * photos as removable thumbnails (mirrors ManageOrphanedPhotos' per-
 * item ConfirmForm pattern), plus an "add more" mini-form for the
 * later-add-to-an-existing-pebble half of this feature (the other half,
 * adding some at creation time, is AdditionalPebblePhotosField directly
 * inside AdminAddPebbleForm/SubmitPebbleForm).
 */
export function AdminAdditionalPhotos({ pebbleId, photos, max }: AdminAdditionalPhotosProps) {
  const [isUploading, setIsUploading] = useState(false);
  const roomRemaining = Math.max(max - photos.length, 0);

  return (
    <div className="flex flex-col gap-2">
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <li key={photo.id} className="flex flex-col items-center gap-1">
              <PebblePhoto src={photo.url} alt="Additional pebble photo" className="h-14 w-14" />
              <ConfirmForm
                action={removeAdditionalPebblePhotoAction.bind(null, photo.id)}
                confirmMessage="Remove this photo?"
              >
                <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                  Remove
                </Button>
              </ConfirmForm>
            </li>
          ))}
        </ul>
      )}

      {roomRemaining > 0 && (
        <form
          action={addAdditionalPebblePhotosAction.bind(null, pebbleId)}
          className="flex flex-wrap items-end gap-2"
        >
          <AdditionalPebblePhotosField
            context="admin"
            max={roomRemaining}
            onUploadingChange={setIsUploading}
          />
          <Button type="submit" variant="secondary" disabled={isUploading}>
            Add
          </Button>
        </form>
      )}
    </div>
  );
}
