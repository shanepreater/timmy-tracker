import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PebblePhoto } from "./PebblePhoto";

describe("PebblePhoto", () => {
  it("renders the image when the URL is valid", () => {
    render(<PebblePhoto src="https://blob.example/photo.webp" alt="Tim stone" className="h-16 w-16" />);

    const image = screen.getByRole("img", { name: "Tim stone" });
    expect(image).toHaveAttribute("src", "https://blob.example/photo.webp");
    expect(image).toHaveClass("h-16", "w-16");
  });

  it("falls back gracefully when the image errors", () => {
    render(<PebblePhoto src="https://blob.example/missing.webp" alt="Tim stone" />);

    const image = screen.getByRole("img", { name: "Tim stone" });
    fireEvent.error(image);

    expect(screen.getByRole("status")).toHaveTextContent("Photo unavailable");
    expect(screen.queryByRole("img", { name: "Tim stone" })).not.toBeInTheDocument();
  });
});
