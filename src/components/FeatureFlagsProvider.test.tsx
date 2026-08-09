import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeatureFlagsProvider, useFeatureFlags } from "./FeatureFlagsProvider";

function FlagReader() {
  const flags = useFeatureFlags();
  return <span>map:{String(flags.map)},pebblePhotos:{String(flags.pebblePhotos)}</span>;
}

describe("FeatureFlagsProvider / useFeatureFlags", () => {
  it("provides the flags passed in to descendants at any depth", () => {
    render(
      <FeatureFlagsProvider flags={{ map: true, submitPebble: false, pebblePhotos: true }}>
        <div>
          <div>
            <FlagReader />
          </div>
        </div>
      </FeatureFlagsProvider>,
    );

    expect(screen.getByText("map:true,pebblePhotos:true")).toBeInTheDocument();
  });

  it("throws when used outside a provider", () => {
    // Swallow the expected React error-boundary console.error noise.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<FlagReader />)).toThrow(
      "useFeatureFlags() must be used within a FeatureFlagsProvider.",
    );

    consoleError.mockRestore();
  });
});
