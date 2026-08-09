import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmForm } from "./ConfirmForm";

describe("ConfirmForm", () => {
  const confirmSpy = vi.spyOn(window, "confirm");

  beforeEach(() => {
    confirmSpy.mockReset();
  });

  afterEach(() => {
    confirmSpy.mockReset();
  });

  it("submits when the user confirms", () => {
    confirmSpy.mockReturnValue(true);
    const action = vi.fn();
    render(
      <ConfirmForm action={action} confirmMessage="Sure?">
        <button type="submit">Delete</button>
      </ConfirmForm>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledWith("Sure?");
    expect(action).toHaveBeenCalled();
  });

  it("does not submit when the user cancels", () => {
    confirmSpy.mockReturnValue(false);
    const action = vi.fn();
    render(
      <ConfirmForm action={action} confirmMessage="Sure?">
        <button type="submit">Delete</button>
      </ConfirmForm>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledWith("Sure?");
    expect(action).not.toHaveBeenCalled();
  });
});
