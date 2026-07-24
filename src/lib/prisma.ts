import { PrismaClient } from "@prisma/client";

/**
 * Reuse a single PrismaClient across hot reloads in dev; Next.js
 * otherwise re-imports this module per request and exhausts the
 * database's connection limit.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
