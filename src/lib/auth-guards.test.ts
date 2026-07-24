import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findUnique = vi.fn();

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { allowedUser: { findUnique } } }));

const {
  getAllowedUser,
  requireAllowedUser,
  requireAdmin,
  UnauthorizedError,
  ForbiddenError,
} = await import("./auth-guards");

beforeEach(() => {
  authMock.mockReset();
  findUnique.mockReset();
});

describe("getAllowedUser", () => {
  it("returns null when there's no session", async () => {
    authMock.mockResolvedValue(null);

    await expect(getAllowedUser()).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the session has no email", async () => {
    authMock.mockResolvedValue({ user: {} });

    await expect(getAllowedUser()).resolves.toBeNull();
  });

  it("looks up the normalized email and returns the AllowedUser row", async () => {
    authMock.mockResolvedValue({ user: { email: "Shane@Example.COM" } });
    const row = { id: "1", email: "shane@example.com", name: null, isAdmin: false, createdAt: new Date() };
    findUnique.mockResolvedValue(row);

    await expect(getAllowedUser()).resolves.toEqual(row);
    expect(findUnique).toHaveBeenCalledWith({ where: { email: "shane@example.com" } });
  });

  it("returns null when the email isn't in AllowedUser", async () => {
    authMock.mockResolvedValue({ user: { email: "nobody@example.com" } });
    findUnique.mockResolvedValue(null);

    await expect(getAllowedUser()).resolves.toBeNull();
  });
});

describe("requireAllowedUser", () => {
  it("throws UnauthorizedError when not allowed", async () => {
    authMock.mockResolvedValue(null);

    await expect(requireAllowedUser()).rejects.toThrow(UnauthorizedError);
  });

  it("returns the user when allowed", async () => {
    authMock.mockResolvedValue({ user: { email: "shane@example.com" } });
    const row = { id: "1", email: "shane@example.com", name: null, isAdmin: false, createdAt: new Date() };
    findUnique.mockResolvedValue(row);

    await expect(requireAllowedUser()).resolves.toEqual(row);
  });
});

describe("requireAdmin", () => {
  it("throws ForbiddenError for an allowed but non-admin user", async () => {
    authMock.mockResolvedValue({ user: { email: "shane@example.com" } });
    findUnique.mockResolvedValue({ id: "1", email: "shane@example.com", isAdmin: false });

    await expect(requireAdmin()).rejects.toThrow(ForbiddenError);
  });

  it("throws UnauthorizedError (not ForbiddenError) when not allowed at all", async () => {
    authMock.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow(UnauthorizedError);
  });

  it("returns the user when isAdmin is true", async () => {
    authMock.mockResolvedValue({ user: { email: "shane@example.com" } });
    const row = { id: "1", email: "shane@example.com", isAdmin: true };
    findUnique.mockResolvedValue(row);

    await expect(requireAdmin()).resolves.toEqual(row);
  });
});
