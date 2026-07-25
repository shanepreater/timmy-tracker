import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("links the logo/site name back to home", () => {
    render(<SiteHeader />);

    const homeLink = screen.getByRole("link", { name: /timmy tracker/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("has a stable accessible name that doesn't depend on the responsive text label", () => {
    // The "Timmy Tracker" text span is hidden below the sm breakpoint
    // (display: none removes it from the accessibility tree), so
    // without an explicit aria-label the link's accessible name would
    // change depending on viewport — pin it via aria-label instead.
    render(<SiteHeader />);

    const homeLink = screen.getByRole("link", { name: /timmy tracker/i });
    expect(homeLink).toHaveAccessibleName("Timmy Tracker home");
  });

  it("renders without extra content when no children are given", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders children in the right-side slot", () => {
    render(
      <SiteHeader>
        <span>shane@example.com</span>
      </SiteHeader>,
    );

    expect(screen.getByText("shane@example.com")).toBeInTheDocument();
  });
});
