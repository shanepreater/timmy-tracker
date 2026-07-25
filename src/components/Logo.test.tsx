import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders Tim's photo with accessible alt text", () => {
    render(<Logo />);

    expect(screen.getByRole("img", { name: "Tim" })).toBeInTheDocument();
  });

  it("sizes the image per the size prop", () => {
    render(<Logo size={64} />);

    const img = screen.getByRole("img", { name: "Tim" });
    expect(img).toHaveAttribute("width", "64");
    expect(img).toHaveAttribute("height", "64");
  });
});
