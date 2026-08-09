import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/Map", () => ({
  Map: () => <div data-testid="map" />,
}));

const getVerifiedPebbles = vi.fn();
vi.mock("@/lib/pebbles", () => ({
  getVerifiedPebbles: (...args: unknown[]) => getVerifiedPebbles(...args),
}));

const getDynamicFeatureFlags = vi.fn();
vi.mock("@/lib/dynamic-feature-flags", () => ({
  getDynamicFeatureFlags: (...args: unknown[]) => getDynamicFeatureFlags(...args),
}));

const { default: Home } = await import("./page");

beforeEach(() => {
  getVerifiedPebbles.mockReset();
  getVerifiedPebbles.mockResolvedValue([]);
  getDynamicFeatureFlags.mockReset();
});

describe("Home", () => {
  it("doesn't show a submit link when the submit-pebble flag is off", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: false, pebblePhotos: false });

    render(await Home());

    expect(screen.queryByRole("link", { name: /submit a pebble/i })).not.toBeInTheDocument();
  });

  it("shows a submit link to /submit when the flag is on", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: true, pebblePhotos: false });

    render(await Home());

    const link = screen.getByRole("link", { name: /submit a pebble/i });
    expect(link).toHaveAttribute("href", "/submit");
  });

  it("skips the pebble query entirely when the map flag is off", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: false, pebblePhotos: false });

    render(await Home());

    expect(getVerifiedPebbles).not.toHaveBeenCalled();
  });

  it("fetches pebbles when the map flag is on", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: true, submitPebble: false, pebblePhotos: false });

    render(await Home());

    expect(getVerifiedPebbles).toHaveBeenCalledTimes(1);
  });
});
