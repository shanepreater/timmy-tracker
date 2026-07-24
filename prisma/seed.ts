import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * A handful of illustrative, clearly-fake pebbles for local development —
 * real locations are added through the admin area once it exists.
 */
const SAMPLE_PEBBLES = [
  {
    id: "seed-pebble-1",
    latitude: 51.5074,
    longitude: -0.1278,
    depositedBy: "Sample: London",
    depositedAt: new Date("2026-02-01"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-02-02"),
  },
  {
    id: "seed-pebble-2",
    latitude: 40.7128,
    longitude: -74.006,
    depositedBy: "Sample: New York",
    depositedAt: new Date("2026-03-15"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-03-16"),
  },
  {
    id: "seed-pebble-3",
    latitude: -33.8688,
    longitude: 151.2093,
    depositedBy: "Sample: Sydney (pending review)",
    depositedAt: new Date("2026-04-10"),
    status: "PENDING" as const,
    verifiedAt: null,
  },
];

async function main() {
  for (const pebble of SAMPLE_PEBBLES) {
    await prisma.pebble.upsert({
      where: { id: pebble.id },
      update: pebble,
      create: pebble,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
