import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ButtonLink } from "./ButtonLink";

describe("ButtonLink", () => {
  it("renders as a link to the given href", () => {
    render(<ButtonLink href="/submit">Submit a pebble</ButtonLink>);

    const link = screen.getByRole("link", { name: "Submit a pebble" });
    expect(link).toHaveAttribute("href", "/submit");
  });

  it("defaults to the primary variant's classes", () => {
    render(<ButtonLink href="/submit">Submit a pebble</ButtonLink>);

    expect(screen.getByRole("link", { name: "Submit a pebble" }).className).toContain(
      "bg-accent",
    );
  });
});
