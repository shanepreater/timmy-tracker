import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PebblePhotoCarousel } from "./PebblePhotoCarousel";

const ONE = [{ url: "https://blob.example/a.webp", alt: "Photo A" }];
const THREE = [
  { url: "https://blob.example/a.webp", alt: "Photo A" },
  { url: "https://blob.example/b.webp", alt: "Photo B" },
  { url: "https://blob.example/c.webp", alt: "Photo C" },
];

describe("PebblePhotoCarousel", () => {
  it("renders nothing for an empty photo list", () => {
    const { container } = render(<PebblePhotoCarousel photos={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a plain photo, with no carousel chrome, for a single photo", () => {
    render(<PebblePhotoCarousel photos={ONE} className="h-24 w-24" />);

    expect(screen.getByRole("img", { name: "Photo A" })).toHaveClass("h-24", "w-24");
    expect(screen.queryByRole("button", { name: /next photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /previous photo/i })).not.toBeInTheDocument();
  });

  describe("with 2+ photos", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows the first photo and a 1 / N counter", () => {
      render(<PebblePhotoCarousel photos={THREE} />);

      expect(screen.getByRole("img", { name: "Photo A" })).toBeInTheDocument();
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("auto-advances to the next photo every 3 seconds", () => {
      render(<PebblePhotoCarousel photos={THREE} />);

      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.getByRole("img", { name: "Photo B" })).toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.getByRole("img", { name: "Photo C" })).toBeInTheDocument();
    });

    it("loops back to the first photo after the last", () => {
      render(<PebblePhotoCarousel photos={THREE} />);

      // Two ticks first, to prove this isn't just the untouched initial
      // render (three ticks alone can't distinguish "advanced and wrapped"
      // from "never advanced at all" — both land back on photo A).
      act(() => { vi.advanceTimersByTime(3000 * 2); });
      expect(screen.getByRole("img", { name: "Photo C" })).toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.getByRole("img", { name: "Photo A" })).toBeInTheDocument();
    });

    it("advances immediately on a manual Next click, and resets the auto-advance timer", () => {
      render(<PebblePhotoCarousel photos={THREE} />);

      fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
      expect(screen.getByRole("img", { name: "Photo B" })).toBeInTheDocument();

      // A moment later — well under a fresh 3s window — nothing should
      // have double-advanced past what the manual click already did.
      act(() => { vi.advanceTimersByTime(1000); });
      expect(screen.getByRole("img", { name: "Photo B" })).toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(2000); });
      expect(screen.getByRole("img", { name: "Photo C" })).toBeInTheDocument();
    });

    it("wraps to the last photo on Previous from the first", () => {
      render(<PebblePhotoCarousel photos={THREE} />);

      fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));

      expect(screen.getByRole("img", { name: "Photo C" })).toBeInTheDocument();
      expect(screen.getByText("3 / 3")).toBeInTheDocument();
    });

    it("wraps to the first photo on Next from the last", () => {
      render(<PebblePhotoCarousel photos={THREE} />);

      fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
      fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
      fireEvent.click(screen.getByRole("button", { name: "Next photo" }));

      expect(screen.getByRole("img", { name: "Photo A" })).toBeInTheDocument();
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });
  });
});
