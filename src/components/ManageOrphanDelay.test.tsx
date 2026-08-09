import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageOrphanDelay } from "./ManageOrphanDelay";

const updateOrphanMinAgeMinutesAction = vi.fn();
vi.mock("@/app/admin/actions", () => ({
  updateOrphanMinAgeMinutesAction: (...args: unknown[]) => updateOrphanMinAgeMinutesAction(...args),
}));

beforeEach(() => {
  updateOrphanMinAgeMinutesAction.mockReset();
});

describe("ManageOrphanDelay", () => {
  it("shows the current threshold pre-filled", () => {
    render(<ManageOrphanDelay minAgeMinutes={15} />);

    const input = screen.getByLabelText(/orphaned photo delay/i) as HTMLInputElement;
    expect(input.value).toBe("15");
  });

  it("submits the updated value", () => {
    render(<ManageOrphanDelay minAgeMinutes={15} />);

    fireEvent.change(screen.getByLabelText(/orphaned photo delay/i), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect(updateOrphanMinAgeMinutesAction).toHaveBeenCalledWith(expect.any(FormData));
  });
});
