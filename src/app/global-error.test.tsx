import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GlobalErrorContent } from "./global-error";

describe("GlobalErrorContent", () => {
  it("shows the friendly message as an alert", () => {
    render(<GlobalErrorContent error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("calls reset when Try again is clicked", () => {
    const reset = vi.fn();
    render(<GlobalErrorContent error={new Error("boom")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
