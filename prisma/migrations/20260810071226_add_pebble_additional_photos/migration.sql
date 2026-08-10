-- CreateTable
CREATE TABLE "PebbleAdditionalPhoto" (
    "id" TEXT NOT NULL,
    "pebbleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PebbleAdditionalPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PebbleAdditionalPhoto_pebbleId_idx" ON "PebbleAdditionalPhoto"("pebbleId");

-- AddForeignKey
ALTER TABLE "PebbleAdditionalPhoto" ADD CONSTRAINT "PebbleAdditionalPhoto_pebbleId_fkey" FOREIGN KEY ("pebbleId") REFERENCES "Pebble"("id") ON DELETE CASCADE ON UPDATE CASCADE;
