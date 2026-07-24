import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestAccessButton } from "./RequestAccessButton";

const requestAccessAction = vi.fn();

vi.mock("@/app/actions/request-access", () => ({
  requestAccessAction: (...args: unknown[]) => requestAccessAction(...args),
}));

beforeEach(() => {
  requestAccessAction.mockReset();
});

describe("RequestAccessButton", () => {
  it("renders a request-access button", () => {
    requestAccessAction.mockResolvedValue({ status: "idle" });
    render(<RequestAccessButton />);

    expect(screen.getByRole("button", { name: /request access/i })).toBeInTheDocument();
  });

  it("shows a confirmation message on success", async () => {
    requestAccessAction.mockResolvedValue({ status: "success" });
    const { container } = render(<RequestAccessButton />);

    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("status")).toHaveTextContent(/request sent/i);
  });

  it("shows an error message returned by the action", async () => {
    requestAccessAction.mockResolvedValue({ status: "error", error: "Something went wrong." });
    const { container } = render(<RequestAccessButton />);

    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
  });
});
