import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("links the logo/site name back to home", () => {
    render(<SiteHeader />);

    const homeLink = screen.getByRole("link", { name: /timmy tracker/i });
    expect(homeLink).toHaveAttribute("href", "/");
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
