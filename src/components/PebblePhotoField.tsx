"use client";

import { useId, useState, type ChangeEvent } from "react";
import { validatePhotoFile } from "@/lib/pebble-photo-constraints";
import {
  uploadRawPebblePhoto,
  type PebblePhotoUploadContext,
} from "@/lib/pebble-photo-client-upload";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "uploaded"; url: string }
  | { status: "error"; message: string };

type PebblePhotoFieldProps = {
  /** Which upload-token route authorizes this upload — see pebble-photo-client-upload.ts. */
  context: PebblePhotoUploadContext;
  /** Server-side error from the last form submission (e.g. "couldn't process that image"). */
  error?: string;
  /** So the form can disable Submit while a photo is still mid-upload. */
  onUploadingChange?: (isUploading: boolean) => void;
};

/**
 * Uploads the photo directly to Blob as soon as it's selected — not on
 * form submit — so a Server Action's request body never carries the
 * raw file (Vercel Functions hard-cap that at 4.5 MB; see
 * docs/design-pebble-photos.md's client-upload amendment). The
 * resulting Blob URL rides along as a plain hidden field, so the
 * surrounding form stays a normal action-bound <form> otherwise.
 *
 * Uploading before the rest of the form is submitted means an
 * abandoned form (photo picked, then never submitted) leaves an
 * orphaned raw upload in Blob — tracked as its own admin cleanup
 * follow-up in docs/features.md rather than solved here.
 */
export function PebblePhotoField({ context, error, onUploadingChange }: PebblePhotoFieldProps) {
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const inputId = useId();

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setUpload({ status: "idle" });
      return;
    }

    const validationError = validatePhotoFile(file);
    if (validationError) {
      setUpload({ status: "error", message: validationError });
      return;
    }

    setUpload({ status: "uploading" });
    onUploadingChange?.(true);
    try {
      const url = await uploadRawPebblePhoto(file, context);
      setUpload({ status: "uploaded", url });
    } catch {
      setUpload({ status: "error", message: "Upload failed. Try a different file." });
    } finally {
      onUploadingChange?.(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">
      <label htmlFor={inputId}>Photo (optional)</label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="input"
        onChange={handleChange}
      />
      {upload.status === "uploading" && (
        <span className="text-sm font-normal text-stone-600 dark:text-stone-400">
          Uploading photo…
        </span>
      )}
      {upload.status === "error" && (
        <span role="alert" className="text-sm font-normal text-red-600 dark:text-red-400">
          {upload.message}
        </span>
      )}
      {error && (
        <span role="alert" className="text-sm font-normal text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
      <input type="hidden" name="rawPhotoUrl" value={upload.status === "uploaded" ? upload.url : ""} />
    </div>
  );
}
