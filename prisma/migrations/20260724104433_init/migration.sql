-- CreateEnum
CREATE TYPE "PebbleStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateTable
CREATE TABLE "Pebble" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "depositedBy" TEXT NOT NULL,
    "depositedAt" TIMESTAMP(3) NOT NULL,
    "status" "PebbleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Pebble_pkey" PRIMARY KEY ("id")
);
