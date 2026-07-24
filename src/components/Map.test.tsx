import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_FEATURE_MAP", "");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Map", () => {
  it("shows a placeholder when the map feature flag is off", async () => {
    vi.resetModules();
    const { Map } = await import("./Map");
    render(<Map />);

    expect(screen.getByRole("status")).toHaveTextContent("Map coming soon.");
  });

  it("shows a placeholder when the flag is on but no API key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_MAP", "true");
    vi.resetModules();

    const { Map } = await import("./Map");
    render(<Map />);

    expect(screen.getByRole("status")).toHaveTextContent("Map coming soon.");
  });
});
