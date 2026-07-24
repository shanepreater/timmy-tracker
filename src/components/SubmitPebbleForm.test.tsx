import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SubmitPebbleForm } from "./SubmitPebbleForm";

const submitPebbleAction = vi.fn();

vi.mock("@/app/submit/actions", () => ({
  submitPebbleAction: (...args: unknown[]) => submitPebbleAction(...args),
}));

const geocode = vi.fn();

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useMapsLibrary: () => ({
    Geocoder: class {
      geocode(request: { address: string }) {
        return geocode(request);
      }
    },
  }),
}));

beforeEach(() => {
  submitPebbleAction.mockReset();
  submitPebbleAction.mockResolvedValue({ status: "idle" });
  geocode.mockReset();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SubmitPebbleForm", () => {
  it("renders a field for each pebble attribute plus a submit button", () => {
    render(<SubmitPebbleForm />);

    expect(screen.getByText("Latitude")).toBeInTheDocument();
    expect(screen.getByText("Longitude")).toBeInTheDocument();
    expect(screen.getByText("Deposited by")).toBeInTheDocument();
    expect(screen.getByText("Date deposited")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit pebble/i })).toBeInTheDocument();
  });

  it("shows field errors returned by the action", async () => {
    submitPebbleAction.mockResolvedValue({
      status: "error",
      errors: { latitude: "Enter a latitude between -90 and 90." },
    });
    const { container } = render(<SubmitPebbleForm />);

    fireEvent.submit(container.querySelector("form")!);

    expect(
      await screen.findByText("Enter a latitude between -90 and 90."),
    ).toBeInTheDocument();
  });

  it("shows a thank-you message instead of the form on success", async () => {
    submitPebbleAction.mockResolvedValue({ status: "success" });
    const { container } = render(<SubmitPebbleForm />);

    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("status")).toHaveTextContent(/awaiting review/i);
    expect(screen.queryByRole("button", { name: /submit pebble/i })).not.toBeInTheDocument();
  });

  describe("place lookup", () => {
    it("fills in lat/long and shows the resolved address on a successful lookup", async () => {
      geocode.mockResolvedValue({
        results: [
          {
            formatted_address: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France",
            geometry: { location: { lat: () => 48.8584, lng: () => 2.2945 } },
          },
        ],
      });
      render(<SubmitPebbleForm />);

      fireEvent.change(screen.getByPlaceholderText(/eiffel tower/i), {
        target: { value: "Eiffel Tower, Paris" },
      });
      fireEvent.click(screen.getByRole("button", { name: /look up/i }));

      expect(await screen.findByText(/Resolved to: Champ de Mars/)).toBeInTheDocument();
      expect(screen.getByDisplayValue("48.8584")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2.2945")).toBeInTheDocument();
    });

    it("shows an error when the place can't be found", async () => {
      geocode.mockResolvedValue({ results: [] });
      render(<SubmitPebbleForm />);

      fireEvent.change(screen.getByPlaceholderText(/eiffel tower/i), {
        target: { value: "Nowhereville" },
      });
      fireEvent.click(screen.getByRole("button", { name: /look up/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't find that place/i);
    });

    it("clears the resolved-address note once coordinates are edited manually", async () => {
      geocode.mockResolvedValue({
        results: [
          {
            formatted_address: "Paris, France",
            geometry: { location: { lat: () => 1, lng: () => 2 } },
          },
        ],
      });
      render(<SubmitPebbleForm />);

      fireEvent.change(screen.getByPlaceholderText(/eiffel tower/i), {
        target: { value: "Paris" },
      });
      fireEvent.click(screen.getByRole("button", { name: /look up/i }));
      await screen.findByText(/Resolved to: Paris/);

      fireEvent.change(screen.getByRole("textbox", { name: "Latitude" }), {
        target: { value: "3" },
      });

      expect(screen.queryByText(/Resolved to:/)).not.toBeInTheDocument();
    });

    it("doesn't render the lookup UI when no Maps API key is configured", () => {
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
      render(<SubmitPebbleForm />);

      expect(screen.queryByRole("button", { name: /look up/i })).not.toBeInTheDocument();
    });
  });
});
