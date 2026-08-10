import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectedPebbleDetails } from "./SelectedPebbleDetails";
import { FeatureFlagsProvider } from "@/components/FeatureFlagsProvider";
import type { DynamicFeatureFlags } from "@/lib/dynamic-feature-flags";
import { formatPebbleDate, type VerifiedPebble } from "@/lib/pebbles";

const OFF_FLAGS: DynamicFeatureFlags = { map: true, submitPebble: false, pebblePhotos: false };

function renderDetails(
  pebble: VerifiedPebble | null,
  flags: Partial<DynamicFeatureFlags> = {},
  onClose = vi.fn(),
) {
  return render(
    <FeatureFlagsProvider flags={{ ...OFF_FLAGS, ...flags }}>
      <SelectedPebbleDetails pebble={pebble} onClose={onClose} />
    </FeatureFlagsProvider>,
  );
}

const pebble: VerifiedPebble = {
  id: "p1",
  latitude: 48.8584,
  longitude: 2.2945,
  depositedBy: "Sarah",
  depositedAt: new Date("2026-03-01"),
  photoUrl: null,
  additionalPhotoUrls: [],
};

describe("SelectedPebbleDetails", () => {
  it("shows a placeholder prompt when nothing is selected", () => {
    renderDetails(null);

    expect(screen.getByRole("status")).toHaveTextContent(/click a pin/i);
  });

  it("shows the depositedBy and date for the selected pebble", () => {
    renderDetails(pebble);

    expect(screen.getByText("Sarah")).toBeInTheDocument();
    expect(screen.getByText(formatPebbleDate(pebble.depositedAt))).toBeInTheDocument();
  });

  it("calls onClose when the Close button is clicked", () => {
    const onClose = vi.fn();
    renderDetails(pebble, {}, onClose);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the photo carousel when photos are enabled and present", () => {
    renderDetails({ ...pebble, photoUrl: "https://blob.example/photo.webp" }, { pebblePhotos: true });

    expect(screen.getByRole("img", { name: "Photo for Sarah" })).toBeInTheDocument();
  });

  it("hides photos when the feature flag is off, even with a photoUrl", () => {
    renderDetails({ ...pebble, photoUrl: "https://blob.example/photo.webp" }, { pebblePhotos: false });

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("includes additional photos alongside the primary photo", () => {
    renderDetails(
      {
        ...pebble,
        photoUrl: "https://blob.example/photo.webp",
        additionalPhotoUrls: ["https://blob.example/extra-a.webp"],
      },
      { pebblePhotos: true },
    );

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
});
