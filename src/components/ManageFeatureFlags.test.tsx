import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageFeatureFlags } from "./ManageFeatureFlags";

const updateFeatureFlagAction = vi.fn();
vi.mock("@/app/admin/actions", () => ({
  updateFeatureFlagAction: (...args: unknown[]) => updateFeatureFlagAction(...args),
}));

beforeEach(() => {
  updateFeatureFlagAction.mockReset();
});

describe("ManageFeatureFlags", () => {
  it("shows each flag's current state", () => {
    render(<ManageFeatureFlags flags={{ map: true, submitPebble: false, pebblePhotos: true }} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Map — on");
    expect(items[1]).toHaveTextContent("Submit a pebble — off");
    expect(items[2]).toHaveTextContent("Pebble photos — on");
  });

  it("toggles an on flag to off on submit", () => {
    render(<ManageFeatureFlags flags={{ map: true, submitPebble: false, pebblePhotos: true }} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Turn off" })[0]);

    expect(updateFeatureFlagAction).toHaveBeenCalledWith("map", true, expect.any(FormData));
  });

  it("toggles an off flag to on on submit", () => {
    render(<ManageFeatureFlags flags={{ map: true, submitPebble: false, pebblePhotos: true }} />);

    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));

    expect(updateFeatureFlagAction).toHaveBeenCalledWith("submitPebble", false, expect.any(FormData));
  });
});
