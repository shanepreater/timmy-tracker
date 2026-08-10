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

    it("shows a placeholder prompt in the details panel until a marker is clicked", () => {
      renderMap([pebble], { map: true });

      expect(screen.getByRole("status")).toHaveTextContent(/click a pin/i);
    });

    it("shows depositedBy and the date in the details panel below the map when a marker is clicked", () => {
      renderMap([pebble], { map: true });

      fireEvent.click(screen.getByRole("button", { name: /Sarah/ }));

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByText("Sarah")).toBeInTheDocument();
      expect(screen.getByText(formatPebbleDate(pebble.depositedAt))).toBeInTheDocument();
    });

    it("clicking the same marker again deselects it", () => {
      renderMap([pebble], { map: true });

      const marker = screen.getByRole("button", { name: /Sarah/ });
      fireEvent.click(marker);
      expect(screen.getByText("Sarah")).toBeInTheDocument();

      fireEvent.click(marker);

      expect(screen.getByRole("status")).toHaveTextContent(/click a pin/i);
    });

    it("deselects when the details panel's Close button is clicked", () => {
      renderMap([pebble], { map: true });

      fireEvent.click(screen.getByRole("button", { name: /Sarah/ }));
      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(screen.getByRole("status")).toHaveTextContent(/click a pin/i);
    });

    it("renders a pebble photo in the details panel when enabled", async () => {
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

    it("shows a carousel with next/prev controls when there's a primary photo plus additional ones", async () => {
      renderMap(
        [
          {
            ...pebble,
            photoUrl: "https://blob.example/photo.webp",
            additionalPhotoUrls: ["https://blob.example/extra-a.webp"],
          },
        ],
        { map: true, pebblePhotos: true },
      );

      fireEvent.click(screen.getByRole("button", { name: /Sarah/ }));

      expect(await screen.findByText("1 / 2")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next photo" })).toBeInTheDocument();
    });

    it("shows the details panel photo even for a pebble with only additional photos and no primary photo", async () => {
      renderMap(
        [{ ...pebble, photoUrl: null, additionalPhotoUrls: ["https://blob.example/extra-a.webp"] }],
        { map: true, pebblePhotos: true },
      );

      fireEvent.click(screen.getByRole("button", { name: /Sarah/ }));

      expect(await screen.findByRole("img", { name: "Photo for Sarah" })).toBeInTheDocument();
    });

    it("still renders a plain, photo-less marker for a pebble with only additional photos (marker stays primary-only)", () => {
      renderMap(
        [{ ...pebble, photoUrl: null, additionalPhotoUrls: ["https://blob.example/extra-a.webp"] }],
        { map: true, pebblePhotos: true },
      );

      expect(screen.queryByRole("img", { name: /marker photo/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sarah/ })).toBeInTheDocument();
    });
  });
});
