/**
 * Shared form-data helpers extracted from submit and admin actions to
 * avoid duplicating raw photo URL extraction logic.
 */

/**
 * Reads the raw photo URL previously uploaded to Blob (see
 * pebble-photos.ts's module comment for the Blob-bypass rationale).
 */
export function getOptionalRawPhotoUrl(formData: FormData): string | null {
  const value = formData.get("rawPhotoUrl");
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Same idea as getOptionalRawPhotoUrl, but for the multi-value additional-photos field. */
export function getRawAdditionalPhotoUrls(formData: FormData): string[] {
  return formData
    .getAll("additionalPhotoUrls")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}
