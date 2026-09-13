import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./error";

describe("Error", () => {
  it("shows the friendly message as an alert", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("calls reset when Try again is clicked", () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("reveals the error digest only after expanding the details disclosure", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<ErrorBoundary error={error} reset={vi.fn()} />);

    expect(screen.queryByText(/abc123/)).not.toBeVisible();

    fireEvent.click(screen.getByText(/show error details/i));

    expect(screen.getByText(/abc123/)).toBeVisible();
  });

  it("omits the digest disclosure entirely when there's no digest", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.queryByText(/show error details/i)).not.toBeInTheDocument();
  });
});
