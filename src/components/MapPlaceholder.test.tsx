import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapPlaceholder } from "./MapPlaceholder";

describe("MapPlaceholder", () => {
  it("announces itself as a status region with the coming-soon message", () => {
    render(<MapPlaceholder />);

    expect(screen.getByRole("status")).toHaveTextContent("Map coming soon.");
  });

  it("sizes itself to match the real map (70vh, min 28rem), so swapping the two causes no layout shift", () => {
    render(<MapPlaceholder />);

    expect(screen.getByRole("status")).toHaveClass("h-[70vh]", "min-h-[28rem]");
  });
});
