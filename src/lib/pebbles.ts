import type { Pebble } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SubmitPebbleInput } from "@/lib/pebble-validation";
import { toPebblePhotoDisplayUrl } from "@/lib/pebble-photo-url";

export type VerifiedPebble = {
  id: string;
  latitude: number;
  longitude: number;
  depositedBy: string;
  depositedAt: Date;
  photoUrl: string | null;
};

/**
 * depositedAt is a calendar date with no time-of-day meaning, and it's
 * parsed from "YYYY-MM-DD" strings (form input, seed literals), which
 * Date parses as UTC midnight. Formatting with UTC getters here — rather
 * than a local-time method like toDateString() — keeps the displayed day
 * the same for every viewer regardless of their browser's timezone.
 */
export function formatPebbleDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Pebbles shown on the public map — only ones an admin has verified.
 * Submissions sit as PENDING (see docs/features.md's MVP admin flow)
 * until then.
 */
export async function getVerifiedPebbles(): Promise<VerifiedPebble[]> {
  const pebbles = await prisma.pebble.findMany({
    where: { status: "VERIFIED" },
    orderBy: { depositedAt: "asc" },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      depositedBy: true,
      depositedAt: true,
      photoUrl: true,
    },
  });

  return pebbles.map((pebble) => ({
    ...pebble,
    photoUrl: pebble.photoUrl ? toPebblePhotoDisplayUrl(pebble.photoUrl) : null,
  }));
}

/**
 * Public submissions always land as PENDING — an admin has to verify one
 * before it shows up in getVerifiedPebbles().
 *
 * submitterEmail is captured from the signed-in session (when
 * FEATURE_AUTH_GATE is on) independently of the editable depositedBy
 * display name — see docs/design-access-control.md's "Pebble provenance"
 * note. It's undefined while the gate is off, since there's no session
 * to capture it from.
 */
export async function submitPebble(
  input: SubmitPebbleInput,
  submitterEmail?: string,
  photoUrl?: string,
): Promise<void> {
  await prisma.pebble.create({
    data: {
      latitude: input.latitude,
      longitude: input.longitude,
      depositedBy: input.depositedBy,
      photoUrl,
      submitterEmail,
      depositedAt: input.depositedAt,
      status: "PENDING",
    },
  });
}

/**
 * Every pebble, for the admin view — unlike getVerifiedPebbles(), which
 * only shows what's already public.
 */
export async function listAllPebbles(): Promise<Pebble[]> {
  const pebbles = await prisma.pebble.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return pebbles.map((pebble) => ({
    ...pebble,
    photoUrl: pebble.photoUrl ? toPebblePhotoDisplayUrl(pebble.photoUrl) : null,
  }));
}

/**
 * An admin typing in a pebble directly is trusted input with no separate
 * submitter to verify against, so it's created already VERIFIED with no
 * submitterEmail — see docs/design-admin-pebbles.md.
 */
export async function createPebbleByAdmin(
  input: SubmitPebbleInput,
  photoUrl?: string,
): Promise<void> {
  await prisma.pebble.create({
    data: {
      latitude: input.latitude,
      longitude: input.longitude,
      depositedBy: input.depositedBy,
      photoUrl: photoUrl ?? null,
      submitterEmail: null,
      depositedAt: input.depositedAt,
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });
}

export async function getPebblePhotoUrl(id: string): Promise<string | null> {
  const pebble = await prisma.pebble.findUnique({
    where: { id },
    select: { photoUrl: true },
  });

  return pebble?.photoUrl ?? null;
}

export async function removePebblePhoto(id: string): Promise<void> {
  await prisma.pebble.update({
    where: { id },
    data: { photoUrl: null },
  });
}

/**
 * Two admins verifying the same pebble at once isn't destructive — both
 * writes converge on the same end state — so this is a plain update, not
 * the conditional updateMany pattern access-requests.ts uses for a race
 * that actually loses data. See docs/design-admin-pebbles.md.
 */
export async function verifyPebble(id: string): Promise<void> {
  await prisma.pebble.update({
    where: { id },
    data: { status: "VERIFIED", verifiedAt: new Date() },
  });
}

export async function movePebble(
  id: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  await prisma.pebble.update({
    where: { id },
    data: { latitude, longitude },
  });
}
