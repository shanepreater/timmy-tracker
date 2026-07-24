import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import type { AllowedUser } from "@prisma/client";

export async function listAllowedUsers(): Promise<AllowedUser[]> {
  return prisma.allowedUser.findMany({ orderBy: { createdAt: "asc" } });
}

export async function addAllowedUser(
  email: string,
  options: { name?: string; isAdmin?: boolean } = {},
): Promise<AllowedUser> {
  return prisma.allowedUser.upsert({
    where: { email: normalizeEmail(email) },
    update: {},
    create: {
      email: normalizeEmail(email),
      name: options.name ?? null,
      isAdmin: options.isAdmin ?? false,
    },
  });
}

export async function removeAllowedUser(id: string): Promise<void> {
  await prisma.allowedUser.delete({ where: { id } });
}

export async function setAllowedUserAdmin(id: string, isAdmin: boolean): Promise<AllowedUser> {
  return prisma.allowedUser.update({ where: { id }, data: { isAdmin } });
}
