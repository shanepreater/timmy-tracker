import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSetting, setSetting } from "@/lib/app-settings";

const TEST_KEY = "INTEGRATION_TEST_SETTING";

afterAll(async () => {
  await prisma.$disconnect();
});

beforeAll(async () => {
  await prisma.appSetting.deleteMany({ where: { key: TEST_KEY } });
});

describe("app-settings (integration)", () => {
  it("returns null for a key that doesn't exist yet", async () => {
    expect(await getSetting(TEST_KEY)).toBeNull();
  });

  it("creates then updates the same key via upsert", async () => {
    await setSetting(TEST_KEY, "first");
    expect(await getSetting(TEST_KEY)).toBe("first");

    await setSetting(TEST_KEY, "second");
    expect(await getSetting(TEST_KEY)).toBe("second");

    const rows = await prisma.appSetting.findMany({ where: { key: TEST_KEY } });
    expect(rows).toHaveLength(1);
  });
});
