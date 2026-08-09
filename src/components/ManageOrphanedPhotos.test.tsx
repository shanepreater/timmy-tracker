import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageOrphanedPhotos } from "./ManageOrphanedPhotos";
import type { OrphanedPhotoUpload } from "@/lib/pebble-photo-orphans";

const deleteOrphanedPhotoUploadAction = vi.fn();
const deleteAllOrphanedPhotoUploadsAction = vi.fn();

vi.mock("@/app/admin/actions", () => ({
  deleteOrphanedPhotoUploadAction: (...args: unknown[]) =>
    deleteOrphanedPhotoUploadAction(...args),
  deleteAllOrphanedPhotoUploadsAction: (...args: unknown[]) =>
    deleteAllOrphanedPhotoUploadsAction(...args),
}));

const orphan: OrphanedPhotoUpload = {
  url: "https://blob.example/pebbles-raw/old.jpg",
  pathname: "pebbles-raw/old.jpg",
  size: 204800,
  uploadedAt: new Date("2026-08-01T00:00:00Z"),
};

describe("ManageOrphanedPhotos", () => {
  const confirmSpy = vi.spyOn(window, "confirm");

  beforeEach(() => {
    deleteOrphanedPhotoUploadAction.mockReset();
    deleteAllOrphanedPhotoUploadsAction.mockReset();
    confirmSpy.mockReset();
  });

  it("shows a message when there are no orphaned uploads", () => {
    render(<ManageOrphanedPhotos orphans={[]} />);

    expect(screen.getByText(/no orphaned uploads/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete all" })).not.toBeInTheDocument();
  });

  it("lists orphaned uploads with size and delete controls", () => {
    render(<ManageOrphanedPhotos orphans={[orphan]} />);

    expect(screen.getByText(/pebbles-raw\/old\.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/200 KB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete all" })).toBeInTheDocument();
  });

  it("deletes a single orphan after confirming", () => {
    confirmSpy.mockReturnValue(true);
    render(<ManageOrphanedPhotos orphans={[orphan]} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteOrphanedPhotoUploadAction).toHaveBeenCalledWith(
      "https://blob.example/pebbles-raw/old.jpg",
      expect.any(FormData),
    );
  });

  it("deletes all orphans after confirming", () => {
    confirmSpy.mockReturnValue(true);
    render(<ManageOrphanedPhotos orphans={[orphan]} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete all" }));

    expect(confirmSpy).toHaveBeenCalledWith("Delete all 1 orphaned upload?");
    expect(deleteAllOrphanedPhotoUploadsAction).toHaveBeenCalledWith(expect.any(FormData));
  });
});
