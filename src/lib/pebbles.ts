import { prisma } from "@/lib/prisma";

export type VerifiedPebble = {
  id: string;
  latitude: number;
  longitude: number;
  depositedBy: string;
  depositedAt: Date;
};

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
