-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable
ALTER TABLE "Pebble" ADD COLUMN     "submitterEmail" TEXT;

-- CreateTable
CREATE TABLE "AllowedUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByEmail" TEXT,
    "note" TEXT,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowedUser_email_key" ON "AllowedUser"("email");

-- Only one PENDING access request per email at a time. Prisma's schema
-- DSL doesn't support partial indexes, so this is hand-written — see
-- docs/design-access-control.md's "Database-level constraints" section.
-- App-level code also checks this before inserting, but this is what
-- actually closes the race two concurrent requests could otherwise win.
CREATE UNIQUE INDEX "access_request_pending_email_unique"
  ON "AccessRequest" ("email")
  WHERE "status" = 'PENDING';

-- Defense in depth alongside pebble-validation.ts's app-level range checks.
ALTER TABLE "Pebble" ADD CONSTRAINT "pebble_latitude_range"
  CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "Pebble" ADD CONSTRAINT "pebble_longitude_range"
  CHECK ("longitude" BETWEEN -180 AND 180);
