import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { VerifiedPebble } from "@/lib/pebbles";

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Map: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Marker: ({ title, onClick }: { title?: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {title}
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
    render(<Map pebbles={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent("Map coming soon.");
  });

  it("shows a placeholder when the flag is on but no API key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_MAP", "true");
    vi.resetModules();

    const { Map } = await import("./Map");
    render(<Map pebbles={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent("Map coming soon.");
  });

  describe("with the map enabled", () => {
    const pebble: VerifiedPebble = {
      id: "p1",
      latitude: 48.8584,
      longitude: 2.2945,
      depositedBy: "Sarah",
      depositedAt: new Date("2026-03-01"),
    };

    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_FEATURE_MAP", "true");
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    });

    it("shows depositedBy and the date when a marker is clicked", async () => {
      vi.resetModules();
      const { Map } = await import("./Map");
      render(<Map pebbles={[pebble]} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Sarah/ }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveTextContent("Sarah");
      expect(dialog).toHaveTextContent(pebble.depositedAt.toDateString());
    });

    it("closes the info window when its close control is clicked", async () => {
      vi.resetModules();
      const { Map } = await import("./Map");
      render(<Map pebbles={[pebble]} />);

      fireEvent.click(screen.getByRole("button", { name: /Sarah/ }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
