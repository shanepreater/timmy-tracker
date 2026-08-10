"use client";

import { useId, useState, type ChangeEvent } from "react";
import { validatePhotoFile } from "@/lib/pebble-photo-constraints";
import {
  uploadRawPebblePhoto,
  type PebblePhotoUploadContext,
} from "@/lib/pebble-photo-client-upload";
import { Button } from "@/components/Button";

type Slot =
  | { id: string; status: "uploading" }
  | { id: string; status: "uploaded"; url: string }
  | { id: string; status: "error"; message: string };

type AdditionalPebblePhotosFieldProps = {
  /** Which upload-token route authorizes each upload — same as PebblePhotoField. */
  context: PebblePhotoUploadContext;
  /** Room remaining for this field — not necessarily the site-wide max (see AdminAdditionalPhotos). */
  max: number;
  onUploadingChange?: (isUploading: boolean) => void;
};

let nextSlotId = 0;

/**
 * Multi-file sibling of PebblePhotoField — same upload-on-select
 * pattern (validatePhotoFile + uploadRawPebblePhoto), extended to N
 * files instead of one. A native <input type="file" multiple>
 * *replaces* its FileList on every selection rather than appending, so
 * slots accumulate in this component's own state across repeated
 * selections instead — the input's value is reset after each change so
 * picking again (even the same file) still fires onChange. Each
 * successfully-uploaded slot renders its own hidden
 * additionalPhotoUrls input; the surrounding form reads all of them
 * via FormData.getAll.
 */
export function AdditionalPebblePhotosField({
  context,
  max,
  onUploadingChange,
}: AdditionalPebblePhotosFieldProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const inputId = useId();

  const roomRemaining = Math.max(max - slots.length, 0);

  function notifyUploading(nextSlots: Slot[]) {
    onUploadingChange?.(nextSlots.some((slot) => slot.status === "uploading"));
  }

  function updateSlot(id: string, slot: Slot) {
    setSlots((prev) => {
      const next = prev.map((existing) => (existing.id === id ? slot : existing));
      notifyUploading(next);
      return next;
    });
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const accepted = files.slice(0, roomRemaining);
    const pending = accepted.map((file) => {
      const validationError = validatePhotoFile(file);
      const id = String(nextSlotId++);
      return {
        file,
        slot: (validationError
          ? { id, status: "error", message: validationError }
          : { id, status: "uploading" }) as Slot,
      };
    });

    setSlots((prev) => {
      const next = [...prev, ...pending.map((p) => p.slot)];
      notifyUploading(next);
      return next;
    });

    await Promise.all(
      pending.map(async ({ file, slot }) => {
        if (slot.status !== "uploading") return;

        try {
          const url = await uploadRawPebblePhoto(file, context);
          updateSlot(slot.id, { id: slot.id, status: "uploaded", url });
        } catch {
          updateSlot(slot.id, {
            id: slot.id,
            status: "error",
            message: "Upload failed. Try a different file.",
          });
        }
      }),
    );
  }

  function removeSlot(id: string) {
    setSlots((prev) => {
      const next = prev.filter((slot) => slot.id !== id);
      notifyUploading(next);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
      <label htmlFor={inputId}>Additional photos (optional, up to {max})</label>
      <input
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="input"
        onChange={handleChange}
        disabled={roomRemaining <= 0}
      />
      {slots.length > 0 && (
        <ul className="flex flex-col gap-1">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between gap-2 text-sm font-normal text-stone-600 dark:text-stone-400"
            >
              {slot.status === "uploading" && <span>Uploading photo…</span>}
              {slot.status === "uploaded" && (
                <>
                  <span>Photo added</span>
                  <input type="hidden" name="additionalPhotoUrls" value={slot.url} />
                </>
              )}
              {slot.status === "error" && (
                <span role="alert" className="text-red-600 dark:text-red-400">
                  {slot.message}
                </span>
              )}
              <Button
                type="button"
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={() => removeSlot(slot.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
