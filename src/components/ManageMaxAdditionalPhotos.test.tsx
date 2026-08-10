import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageMaxAdditionalPhotos } from "./ManageMaxAdditionalPhotos";

const updateMaxAdditionalPhotosAction = vi.fn();
vi.mock("@/app/admin/actions", () => ({
  updateMaxAdditionalPhotosAction: (...args: unknown[]) => updateMaxAdditionalPhotosAction(...args),
}));

beforeEach(() => {
  updateMaxAdditionalPhotosAction.mockReset();
});

describe("ManageMaxAdditionalPhotos", () => {
  it("shows the current max pre-filled", () => {
    render(<ManageMaxAdditionalPhotos maxCount={5} />);

    const input = screen.getByLabelText(/max additional photos/i) as HTMLInputElement;
    expect(input.value).toBe("5");
  });

  it("submits the updated value", () => {
    render(<ManageMaxAdditionalPhotos maxCount={5} />);

    fireEvent.change(screen.getByLabelText(/max additional photos/i), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect(updateMaxAdditionalPhotosAction).toHaveBeenCalledWith(expect.any(FormData));
  });
});
