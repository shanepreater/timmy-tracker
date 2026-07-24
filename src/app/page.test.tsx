import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/Map", () => ({
  Map: () => <div data-testid="map" />,
}));

const getVerifiedPebbles = vi.fn();
vi.mock("@/lib/pebbles", () => ({
  getVerifiedPebbles: (...args: unknown[]) => getVerifiedPebbles(...args),
}));

beforeEach(() => {
  getVerifiedPebbles.mockResolvedValue([]);
  vi.stubEnv("NEXT_PUBLIC_FEATURE_MAP", "");
  vi.stubEnv("NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Home", () => {
  it("doesn't show a submit link when the submit-pebble flag is off", async () => {
    vi.resetModules();
    const { default: Home } = await import("./page");
    render(await Home());

    expect(screen.queryByRole("link", { name: /submit a pebble/i })).not.toBeInTheDocument();
  });

  it("shows a submit link to /submit when the flag is on", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE", "true");
    vi.resetModules();
    const { default: Home } = await import("./page");
    render(await Home());

    const link = screen.getByRole("link", { name: /submit a pebble/i });
    expect(link).toHaveAttribute("href", "/submit");
  });
});
