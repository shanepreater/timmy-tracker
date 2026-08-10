import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Map } from "@/components/Map";
import { FeatureFlagsProvider } from "@/components/FeatureFlagsProvider";
import type { DynamicFeatureFlags } from "@/lib/dynamic-feature-flags";
import { formatPebbleDate, type VerifiedPebble } from "@/lib/pebbles";

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Map: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AdvancedMarker: ({
    title,
    onClick,
    children,
  }: {
    title?: string;
    onClick?: () => void;
    children?: ReactNode;
  }) => (
    <button type="button" onClick={onClick}>
      {children ?? title}
    </button>
  ),
  InfoWindow: ({
    children,
    onCloseClick,
  }: {
    children: ReactNode;
    onCloseClick?: () => void;
  }) => (
    <div role="dialog">
      {children}
      <button type="button" onClick={onCloseClick}>
        Close
      </button>
    </div>
  ),
}));

const OFF_FLAGS: DynamicFeatureFlags = { map: false, submitPebble: false, pebblePhotos: false };

function renderMap(pebbles: VerifiedPebble[], flags: Partial<DynamicFeatureFlags> = {}) {
  return render(
    <FeatureFlagsProvider flags={{ ...OFF_FLAGS, ...flags }}>
      <Map pebbles={pebbles} />
    </FeatureFlagsProvider>,
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Map", () => {
  it("shows a placeholder when the map feature flag is off", () => {
    renderMap([]);

    expect(screen.getByRole("status")).toHaveTextContent("Map coming soon.");
  });

  it("shows a placeholder when the flag is on but no API key is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", "test-map-id");

    renderMap([], { map: true });

    expect(screen.getByRole("status")).toHaveTextContent("Map coming soon.");
  });

  it("shows a placeholder when the flag and API key are set but no Map ID is configured", () => {
    // AdvancedMarkerElement (replacing the deprecated google.maps.Marker)
    // requires a Map ID to render at all — see docs/design.md's Maps row.
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");

    renderMap([], { map: true });

    expect(screen.getByRole("status")).toHaveTextContent("Map coming soon.");
  });

  describe("with the map enabled", () => {
    const pebble: VerifiedPebble = {
      id: "p1",
      latitude: 48.8584,
      longitude: 2.2945,
      depositedBy: "Sarah",
      depositedAt: new Date("2026-03-01"),
      photoUrl: null,
      additionalPhotoUrls: [],
    };

    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", "test-map-id");
    });

    it("shows depositedBy and the date when a marker is clicked", () => {
      renderMap([pebble], { map: true });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Sarah/ }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveTextContent("Sarah");
      expect(dialog).toHaveTextContent(formatPebbleDate(pebble.depositedAt));
    });

    it("closes the info window when its close control is clicked", () => {
      renderMap([pebble], { map: true });

      fireEvent.click(screen.getByRole("button", { name: /Sarah/ }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders a pebble photo in the info window when enabled", async () => {
      renderMap([{ ...pebble, photoUrl: "https://blob.example/photo.webp" }], {
        map: true,
        pebblePhotos: true,
      });

      fireEvent.click(screen.getByRole("button", { name: /Sarah/ }));

      expect(await screen.findByRole("img", { name: "Photo for Sarah" })).toBeInTheDocument();
    });

    it("renders a thumbnail marker when a photo is present and enabled", async () => {
      renderMap([{ ...pebble, photoUrl: "https://blob.example/photo.webp" }], {
        map: true,
        pebblePhotos: true,
      });

      expect(await screen.findByRole("img", { name: "Marker photo for Sarah" })).toBeInTheDocument();
    });
  });
});
