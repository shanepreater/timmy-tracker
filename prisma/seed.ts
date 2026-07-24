import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * TEMPLATE data — real-world landmarks standing in for Tim's actual
 * pebbles, until the real dataset (place, who deposited it, when) is
 * supplied. Replace depositedBy/depositedAt (and coordinates, if the
 * real spot differs) with the real details; the shape/fields are what
 * matters here, not these specific placements.
 */
const SAMPLE_PEBBLES = [
  {
    id: "seed-pebble-eiffel-tower",
    // Eiffel Tower, Paris, France
    latitude: 48.8584,
    longitude: 2.2945,
    depositedBy: "Sarah",
    depositedAt: new Date("2026-02-14"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-02-15"),
  },
  {
    id: "seed-pebble-golden-gate",
    // Golden Gate Bridge, San Francisco, USA
    latitude: 37.8199,
    longitude: -122.4783,
    depositedBy: "Marcus",
    depositedAt: new Date("2026-02-28"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-03-01"),
  },
  {
    id: "seed-pebble-sydney-opera-house",
    // Sydney Opera House, Australia
    latitude: -33.8568,
    longitude: 151.2153,
    depositedBy: "Priya",
    depositedAt: new Date("2026-03-10"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-03-12"),
  },
  {
    id: "seed-pebble-mount-fuji",
    // Mount Fuji, Japan
    latitude: 35.3606,
    longitude: 138.7274,
    depositedBy: "Kenji",
    depositedAt: new Date("2026-03-22"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-03-24"),
  },
  {
    id: "seed-pebble-santorini",
    // Santorini, Greece
    latitude: 36.3932,
    longitude: 25.4615,
    depositedBy: "Elena",
    depositedAt: new Date("2026-04-05"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-04-06"),
  },
  {
    id: "seed-pebble-machu-picchu",
    // Machu Picchu, Peru
    latitude: -13.1631,
    longitude: -72.545,
    depositedBy: "Diego",
    depositedAt: new Date("2026-04-18"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-04-19"),
  },
  {
    id: "seed-pebble-table-mountain",
    // Table Mountain, Cape Town, South Africa
    latitude: -33.9628,
    longitude: 18.4098,
    depositedBy: "Naledi",
    depositedAt: new Date("2026-05-02"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-05-03"),
  },
  {
    id: "seed-pebble-edinburgh-castle",
    // Edinburgh Castle, Scotland, UK
    latitude: 55.9486,
    longitude: -3.1999,
    depositedBy: "Fiona",
    depositedAt: new Date("2026-05-20"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-05-21"),
  },
  {
    id: "seed-pebble-uluru",
    // Uluru, Australia
    latitude: -25.3444,
    longitude: 131.0369,
    depositedBy: "Jack",
    depositedAt: new Date("2026-06-08"),
    status: "VERIFIED" as const,
    verifiedAt: new Date("2026-06-10"),
  },
  {
    id: "seed-pebble-niagara-falls",
    // Niagara Falls, Canada/USA border — awaiting verification, to
    // demo the admin review queue once that flow exists.
    latitude: 43.0962,
    longitude: -79.0377,
    depositedBy: "Amelia",
    depositedAt: new Date("2026-06-25"),
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
