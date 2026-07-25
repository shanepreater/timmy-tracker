import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders as a native button with the given text", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("defaults to the primary variant", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" }).className).toContain("bg-accent");
  });

  it("applies the secondary variant's classes", () => {
    render(<Button variant="secondary">Cancel</Button>);

    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain("border-stone-300");
  });

  it("applies the danger variant's classes", () => {
    render(<Button variant="danger">Delete</Button>);

    expect(screen.getByRole("button", { name: "Delete" }).className).toContain("text-red-700");
  });

  it("passes through native button props", () => {
    render(<Button type="submit" disabled>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeDisabled();
  });
});
