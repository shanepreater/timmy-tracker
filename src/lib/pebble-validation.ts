export type SubmitPebbleInput = {
  latitude: number;
  longitude: number;
  depositedBy: string;
  depositedAt: Date;
};

export type SubmitPebbleFormValues = {
  latitude: string;
  longitude: string;
  depositedBy: string;
  depositedAt: string;
};

export type SubmitPebbleFormErrors = Partial<
  Record<keyof SubmitPebbleFormValues, string>
>;

export type ValidateSubmitPebbleResult =
  | { data: SubmitPebbleInput; errors?: never }
  | { data?: never; errors: SubmitPebbleFormErrors };

/**
 * Public submissions take raw lat/long rather than a place name — geocoding
 * a name is an admin convenience feature (docs/features.md), not part of
 * this form.
 */
export function validateSubmitPebbleInput(
  values: SubmitPebbleFormValues,
): ValidateSubmitPebbleResult {
  const errors: SubmitPebbleFormErrors = {};

  const latitude = Number(values.latitude);
  if (values.latitude.trim() === "" || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
    errors.latitude = "Enter a latitude between -90 and 90.";
  }

  const longitude = Number(values.longitude);
  if (
    values.longitude.trim() === "" ||
    Number.isNaN(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    errors.longitude = "Enter a longitude between -180 and 180.";
  }

  const depositedBy = values.depositedBy.trim();
  if (!depositedBy) {
    errors.depositedBy = "Let us know who deposited it.";
  }

  const depositedAt = new Date(values.depositedAt);
  if (!values.depositedAt || Number.isNaN(depositedAt.getTime())) {
    errors.depositedAt = "Enter a valid date.";
  } else if (depositedAt.getTime() > Date.now()) {
    errors.depositedAt = "Date deposited can't be in the future.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return { data: { latitude, longitude, depositedBy, depositedAt } };
}
