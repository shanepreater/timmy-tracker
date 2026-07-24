import { prisma } from "@/lib/prisma";
import type { SubmitPebbleInput } from "@/lib/pebble-validation";

export type VerifiedPebble = {
  id: string;
  latitude: number;
  longitude: number;
  depositedBy: string;
  depositedAt: Date;
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
  return prisma.pebble.findMany({
    where: { status: "VERIFIED" },
    orderBy: { depositedAt: "asc" },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      depositedBy: true,
      depositedAt: true,
    },
  });
}

/**
 * Public submissions always land as PENDING — an admin has to verify one
 * before it shows up in getVerifiedPebbles().
 */
export async function submitPebble(input: SubmitPebbleInput): Promise<void> {
  await prisma.pebble.create({
    data: {
      latitude: input.latitude,
      longitude: input.longitude,
      depositedBy: input.depositedBy,
      depositedAt: input.depositedAt,
      status: "PENDING",
    },
  });
}
