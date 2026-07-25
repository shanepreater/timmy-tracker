import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlaceLookup } from "./PlaceLookup";

const geocode = vi.fn();

vi.mock("@vis.gl/react-google-maps", () => ({
  useMapsLibrary: () => ({
    Geocoder: class {
      geocode(request: { address: string }) {
        return geocode(request);
      }
    },
  }),
}));

beforeEach(() => {
  geocode.mockReset();
});

describe("PlaceLookup", () => {
  it("resolves a place and reports lat/long plus the formatted address", async () => {
    geocode.mockResolvedValue({
      results: [
        {
          formatted_address: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France",
          geometry: { location: { lat: () => 48.8584, lng: () => 2.2945 } },
        },
      ],
    });
    const onResolved = vi.fn();
    render(<PlaceLookup onResolved={onResolved} />);

    fireEvent.change(screen.getByPlaceholderText(/eiffel tower/i), {
      target: { value: "Eiffel Tower, Paris" },
    });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));

    await waitFor(() => expect(onResolved).toHaveBeenCalledWith({
      latitude: 48.8584,
      longitude: 2.2945,
      formattedAddress: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France",
    }));
  });

  it("shows an error when the place can't be found", async () => {
    geocode.mockResolvedValue({ results: [] });
    render(<PlaceLookup onResolved={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/eiffel tower/i), {
      target: { value: "Nowhereville" },
    });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't find that place/i);
  });

  it("clears a stale lookup error once the place name is edited", async () => {
    geocode.mockResolvedValue({ results: [] });
    render(<PlaceLookup onResolved={vi.fn()} />);

    const placeInput = screen.getByPlaceholderText(/eiffel tower/i);
    fireEvent.change(placeInput, { target: { value: "Nowhereville" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    await screen.findByRole("alert");

    fireEvent.change(placeInput, { target: { value: "Nowhereville, but different" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
