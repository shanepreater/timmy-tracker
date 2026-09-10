"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { submitPebbleAction, type SubmitPebbleState } from "@/app/submit/actions";
import { PlaceLookup, type ResolvedPlace } from "@/components/PlaceLookup";
import { PebblePhotoField } from "@/components/PebblePhotoField";
import { AdditionalPebblePhotosField } from "@/components/AdditionalPebblePhotosField";
import { Button } from "@/components/Button";
import { useFeatureFlags } from "@/components/FeatureFlagsProvider";

const initialState: SubmitPebbleState = { status: "idle" };

type SubmitPebbleFormProps = {
  /** Server-configured cap on additional photos — see docs/design-pebble-photos.md. */
  maxAdditionalPhotos: number;
};

export function SubmitPebbleForm({ maxAdditionalPhotos }: SubmitPebbleFormProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { pebblePhotos: pebblePhotosEnabled } = useFeatureFlags();
  const [state, formAction, isPending] = useActionState(submitPebbleAction, initialState);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [additionalPhotosUploading, setAdditionalPhotosUploading] = useState(false);
  const successRef = useRef<HTMLParagraphElement>(null);
  const uid = useId();

  // Focus the success message so screen readers announce it (WCAG 3.3.1).
  useEffect(() => {
    if (state.status === "success") {
      successRef.current?.focus();
    }
  }, [state.status]);

  if (state.status === "success") {
    return (
      <p ref={successRef} tabIndex={-1} role="status" className="text-lg">
        Thank you — your pebble has been submitted and is awaiting review.
      </p>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const latitudeId = `${uid}-latitude-error`;
  const longitudeId = `${uid}-longitude-error`;
  const depositedById = `${uid}-depositedBy-error`;
  const depositedAtId = `${uid}-depositedAt-error`;

  function handleResolved(place: ResolvedPlace) {
    setLatitude(String(place.latitude));
    setLongitude(String(place.longitude));
    setResolvedAddress(place.formattedAddress);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      {apiKey && (
        <APIProvider apiKey={apiKey}>
          <PlaceLookup onResolved={handleResolved} />
        </APIProvider>
      )}

      {resolvedAddress && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Resolved to: {resolvedAddress}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">
        Latitude
        <input
          name="latitude"
          type="text"
          inputMode="decimal"
          required
          className="input"
          value={latitude}
          aria-invalid={!!errors.latitude}
          aria-describedby={errors.latitude ? latitudeId : undefined}
          onChange={(event) => {
            setLatitude(event.target.value);
            setResolvedAddress(null);
          }}
        />
        {errors.latitude && (
          <span id={latitudeId} role="alert" className="text-sm font-normal text-red-600 dark:text-red-400">
            {errors.latitude}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">
        Longitude
        <input
          name="longitude"
          type="text"
          inputMode="decimal"
          required
          className="input"
          value={longitude}
          aria-invalid={!!errors.longitude}
          aria-describedby={errors.longitude ? longitudeId : undefined}
          onChange={(event) => {
            setLongitude(event.target.value);
            setResolvedAddress(null);
          }}
        />
        {errors.longitude && (
          <span id={longitudeId} role="alert" className="text-sm font-normal text-red-600 dark:text-red-400">
            {errors.longitude}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">
        Deposited by
        <input name="depositedBy" type="text" required className="input"
          aria-invalid={!!errors.depositedBy}
          aria-describedby={errors.depositedBy ? depositedById : undefined}
        />
        {errors.depositedBy && (
          <span id={depositedById} role="alert" className="text-sm font-normal text-red-600 dark:text-red-400">
            {errors.depositedBy}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">
        Date deposited
        <input name="depositedAt" type="date" required className="input"
          aria-invalid={!!errors.depositedAt}
          aria-describedby={errors.depositedAt ? depositedAtId : undefined}
        />
        {errors.depositedAt && (
          <span id={depositedAtId} role="alert" className="text-sm font-normal text-red-600 dark:text-red-400">
            {errors.depositedAt}
          </span>
        )}
      </label>

      {pebblePhotosEnabled && (
        <PebblePhotoField
          context="submit"
          error={errors.photo}
          onUploadingChange={setPhotoUploading}
        />
      )}

      {pebblePhotosEnabled && maxAdditionalPhotos > 0 && (
        <AdditionalPebblePhotosField
          context="submit"
          max={maxAdditionalPhotos}
          onUploadingChange={setAdditionalPhotosUploading}
        />
      )}

      <Button
        type="submit"
        disabled={isPending || photoUploading || additionalPhotosUploading}
        className="self-start"
      >
        {isPending ? "Submitting…" : "Submit pebble"}
      </Button>
    </form>
  );
}
