import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/SubmitPebbleForm", () => ({
  SubmitPebbleForm: () => <div data-testid="submit-pebble-form" />,
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("SubmitPage", () => {
  it("shows a coming-soon message when the feature flag is off", async () => {
    vi.resetModules();
    const { default: SubmitPage } = await import("./page");
    render(<SubmitPage />);

    expect(screen.getByRole("status")).toHaveTextContent(/isn't open yet/i);
    expect(screen.queryByTestId("submit-pebble-form")).not.toBeInTheDocument();
  });

  it("renders the form when the feature flag is on", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_SUBMIT_PEBBLE", "true");
    vi.resetModules();
    const { default: SubmitPage } = await import("./page");
    render(<SubmitPage />);

    expect(screen.getByRole("heading", { name: /submit a pebble/i })).toBeInTheDocument();
    expect(screen.getByTestId("submit-pebble-form")).toBeInTheDocument();
  });
});
