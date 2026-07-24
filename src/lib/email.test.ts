import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Shane@Example.COM  ")).toBe("shane@example.com");
  });

  it("is idempotent", () => {
    expect(normalizeEmail(normalizeEmail("Shane@Example.com"))).toBe("shane@example.com");
  });
});
