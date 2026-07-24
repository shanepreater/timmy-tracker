import { describe, expect, it } from "vitest";
import { validateCoordinates, validateSubmitPebbleInput } from "./pebble-validation";

const VALID = {
  latitude: "48.8584",
  longitude: "2.2945",
  depositedBy: "Sarah",
  depositedAt: "2026-03-01",
};

describe("validateSubmitPebbleInput", () => {
  it("accepts valid input and parses numeric/date fields", () => {
    const result = validateSubmitPebbleInput(VALID);

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      latitude: 48.8584,
      longitude: 2.2945,
      depositedBy: "Sarah",
      depositedAt: new Date("2026-03-01"),
    });
  });

  it.each([
    ["", "Enter a latitude between -90 and 90."],
    ["not-a-number", "Enter a latitude between -90 and 90."],
    ["91", "Enter a latitude between -90 and 90."],
    ["-91", "Enter a latitude between -90 and 90."],
  ])("rejects latitude %j", (latitude, expected) => {
    const result = validateSubmitPebbleInput({ ...VALID, latitude });
    expect(result.errors?.latitude).toBe(expected);
  });

  it.each([
    ["", "Enter a longitude between -180 and 180."],
    ["not-a-number", "Enter a longitude between -180 and 180."],
    ["181", "Enter a longitude between -180 and 180."],
    ["-181", "Enter a longitude between -180 and 180."],
  ])("rejects longitude %j", (longitude, expected) => {
    const result = validateSubmitPebbleInput({ ...VALID, longitude });
    expect(result.errors?.longitude).toBe(expected);
  });

  it("rejects blank/whitespace-only depositedBy", () => {
    const result = validateSubmitPebbleInput({ ...VALID, depositedBy: "   " });
    expect(result.errors?.depositedBy).toBe("Let us know who deposited it.");
  });

  it("rejects an invalid depositedAt", () => {
    const result = validateSubmitPebbleInput({ ...VALID, depositedAt: "not-a-date" });
    expect(result.errors?.depositedAt).toBe("Enter a valid date.");
  });

  it("rejects a depositedAt in the future", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = validateSubmitPebbleInput({ ...VALID, depositedAt: future });
    expect(result.errors?.depositedAt).toBe("Date deposited can't be in the future.");
  });

  it("collects errors from multiple invalid fields at once", () => {
    const result = validateSubmitPebbleInput({
      latitude: "",
      longitude: "",
      depositedBy: "",
      depositedAt: "",
    });

    expect(result.errors).toEqual({
      latitude: "Enter a latitude between -90 and 90.",
      longitude: "Enter a longitude between -180 and 180.",
      depositedBy: "Let us know who deposited it.",
      depositedAt: "Enter a valid date.",
    });
  });
});

describe("validateCoordinates", () => {
  it("accepts valid coordinates and parses them to numbers", () => {
    const result = validateCoordinates("48.8584", "2.2945");
    expect(result.errors).toBeUndefined();
    expect(result).toMatchObject({ latitude: 48.8584, longitude: 2.2945 });
  });

  it("rejects an out-of-range latitude", () => {
    const result = validateCoordinates("91", "0");
    expect(result.errors?.latitude).toBe("Enter a latitude between -90 and 90.");
  });

  it("rejects an out-of-range longitude", () => {
    const result = validateCoordinates("0", "181");
    expect(result.errors?.longitude).toBe("Enter a longitude between -180 and 180.");
  });

  it("collects errors from both fields at once", () => {
    const result = validateCoordinates("", "");
    expect(result.errors).toEqual({
      latitude: "Enter a latitude between -90 and 90.",
      longitude: "Enter a longitude between -180 and 180.",
    });
  });
});
