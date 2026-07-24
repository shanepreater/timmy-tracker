import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const upsert = vi.fn();
const del = vi.fn();
const update = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { allowedUser: { findMany, upsert, delete: del, update } },
}));

const { listAllowedUsers, addAllowedUser, removeAllowedUser, setAllowedUserAdmin } =
  await import("./allowed-users");

beforeEach(() => {
  findMany.mockReset();
  upsert.mockReset();
  del.mockReset();
  update.mockReset();
});

describe("listAllowedUsers", () => {
  it("lists users oldest first", async () => {
    findMany.mockResolvedValue([]);

    await listAllowedUsers();

    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "asc" } });
  });
});

describe("addAllowedUser", () => {
  it("normalizes the email and defaults name/isAdmin", async () => {
    upsert.mockResolvedValue({ id: "u1" });

    await addAllowedUser("Shane@Example.COM");

    expect(upsert).toHaveBeenCalledWith({
      where: { email: "shane@example.com" },
      update: {},
      create: { email: "shane@example.com", name: null, isAdmin: false },
    });
  });

  it("passes through name and isAdmin when given", async () => {
    upsert.mockResolvedValue({ id: "u1" });

    await addAllowedUser("shane@example.com", { name: "Shane", isAdmin: true });

    expect(upsert).toHaveBeenCalledWith({
      where: { email: "shane@example.com" },
      update: {},
      create: { email: "shane@example.com", name: "Shane", isAdmin: true },
    });
  });
});

describe("removeAllowedUser", () => {
  it("deletes by id", async () => {
    del.mockResolvedValue({ id: "u1" });

    await removeAllowedUser("u1");

    expect(del).toHaveBeenCalledWith({ where: { id: "u1" } });
  });
});

describe("setAllowedUserAdmin", () => {
  it("updates the isAdmin flag", async () => {
    update.mockResolvedValue({ id: "u1", isAdmin: true });

    await setAllowedUserAdmin("u1", true);

    expect(update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { isAdmin: true } });
  });
});
