import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubmitPebbleForm } from "./SubmitPebbleForm";

const submitPebbleAction = vi.fn();

vi.mock("@/app/submit/actions", () => ({
  submitPebbleAction: (...args: unknown[]) => submitPebbleAction(...args),
}));

beforeEach(() => {
  submitPebbleAction.mockReset();
});

describe("SubmitPebbleForm", () => {
  it("renders a field for each pebble attribute plus a submit button", () => {
    submitPebbleAction.mockResolvedValue({ status: "idle" });
    render(<SubmitPebbleForm />);

    expect(screen.getByText("Latitude")).toBeInTheDocument();
    expect(screen.getByText("Longitude")).toBeInTheDocument();
    expect(screen.getByText("Deposited by")).toBeInTheDocument();
    expect(screen.getByText("Date deposited")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit pebble/i })).toBeInTheDocument();
  });

  it("shows field errors returned by the action", async () => {
    submitPebbleAction.mockResolvedValue({
      status: "error",
      errors: { latitude: "Enter a latitude between -90 and 90." },
    });
    const { container } = render(<SubmitPebbleForm />);

    fireEvent.submit(container.querySelector("form")!);

    expect(
      await screen.findByText("Enter a latitude between -90 and 90."),
    ).toBeInTheDocument();
  });

  it("shows a thank-you message instead of the form on success", async () => {
    submitPebbleAction.mockResolvedValue({ status: "success" });
    const { container } = render(<SubmitPebbleForm />);

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/awaiting review/i);
    });
    expect(screen.queryByRole("button", { name: /submit pebble/i })).not.toBeInTheDocument();
  });
});
