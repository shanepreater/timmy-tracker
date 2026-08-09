import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { appSetting: { findUnique, upsert } },
}));

const { getSetting, setSetting } = await import("./app-settings");

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset();
});

describe("getSetting", () => {
  it("returns the value when the key exists", async () => {
    findUnique.mockResolvedValue({ key: "FOO", value: "bar" });

    expect(await getSetting("FOO")).toBe("bar");
    expect(findUnique).toHaveBeenCalledWith({ where: { key: "FOO" } });
  });

  it("returns null when the key doesn't exist", async () => {
    findUnique.mockResolvedValue(null);

    expect(await getSetting("MISSING")).toBeNull();
  });
});

describe("setSetting", () => {
  it("upserts the key/value pair", async () => {
    await setSetting("FOO", "bar");

    expect(upsert).toHaveBeenCalledWith({
      where: { key: "FOO" },
      update: { value: "bar" },
      create: { key: "FOO", value: "bar" },
    });
  });
});
