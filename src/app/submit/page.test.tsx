import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/SubmitPebbleForm", () => ({
  SubmitPebbleForm: () => <div data-testid="submit-pebble-form" />,
}));

const getDynamicFeatureFlags = vi.fn();
vi.mock("@/lib/dynamic-feature-flags", () => ({
  getDynamicFeatureFlags: (...args: unknown[]) => getDynamicFeatureFlags(...args),
}));

const { default: SubmitPage } = await import("./page");

beforeEach(() => {
  getDynamicFeatureFlags.mockReset();
});

describe("SubmitPage", () => {
  it("shows a coming-soon message when the feature flag is off", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: false, pebblePhotos: false });

    render(await SubmitPage());

    expect(screen.getByRole("status")).toHaveTextContent(/isn't open yet/i);
    expect(screen.queryByTestId("submit-pebble-form")).not.toBeInTheDocument();
  });

  it("renders the form when the feature flag is on", async () => {
    getDynamicFeatureFlags.mockResolvedValue({ map: false, submitPebble: true, pebblePhotos: false });

    render(await SubmitPage());

    expect(screen.getByRole("heading", { name: /submit a pebble/i })).toBeInTheDocument();
    expect(screen.getByTestId("submit-pebble-form")).toBeInTheDocument();
  });
});
