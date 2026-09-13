import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Replaces next/dynamic's real lazy-loading with its `loading` option
// rendered directly, so this test can assert on what page.tsx actually
// wires up as the map's loading fallback without needing to wait out a
// real dynamic import.
vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options: { loading: () => ReactNode }) => options.loading,
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
  getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: false, pebblePhotos: false });
});

describe("Home's map loading fallback", () => {
  it("uses the shared MapPlaceholder while the Map chunk is loading", async () => {
    render(await Home());

    // Same role/text/sizing as Map.tsx's own disabled-state placeholder
    // (src/components/MapPlaceholder.tsx) — kept as one component so the
    // two states can't drift into different box sizes and cause a
    // layout shift once the chunk resolves.
    expect(screen.getByRole("status")).toHaveTextContent("Map coming soon.");
  });
});
