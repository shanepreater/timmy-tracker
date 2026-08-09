import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPebbles } from "./AdminPebbles";
import type { Pebble } from "@prisma/client";

const deletePebbleAction = vi.fn();

vi.mock("@/app/admin/actions", () => ({
  verifyPebbleAction: vi.fn(),
  movePebbleAction: vi.fn(),
  removePebblePhotoAction: vi.fn(),
  deletePebbleAction: (...args: unknown[]) => deletePebbleAction(...args),
}));

vi.mock("@/components/AdminAddPebbleForm", () => ({
  AdminAddPebbleForm: () => <div>Add pebble form</div>,
}));

const basePebble: Pebble = {
  id: "p1",
  latitude: 48.8584,
  longitude: 2.2945,
  depositedBy: "Sarah",
  photoUrl: null,
  submitterEmail: null,
  depositedAt: new Date("2026-03-01"),
  status: "PENDING",
  createdAt: new Date("2026-03-01"),
  verifiedAt: null,
};

describe("AdminPebbles", () => {
  const confirmSpy = vi.spyOn(window, "confirm");

  beforeEach(() => {
    deletePebbleAction.mockReset();
    confirmSpy.mockReset();
  });

  it("shows a message when there are no pending submissions", () => {
    render(<AdminPebbles pebbles={[]} pebblePhotosEnabled={false} />);

    expect(screen.getByText(/no pending submissions/i)).toBeInTheDocument();
  });

  it("lists pending pebbles with a verify control", () => {
    render(<AdminPebbles pebbles={[basePebble]} pebblePhotosEnabled={false} />);

    expect(screen.getByText(/Sarah — Mar 1, 2026/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
  });

  it("shows a message when there are no verified pebbles", () => {
    render(<AdminPebbles pebbles={[]} pebblePhotosEnabled={false} />);

    expect(screen.getByText(/no verified pebbles yet/i)).toBeInTheDocument();
  });

  it("lists verified pebbles with a pre-filled move form", () => {
    const verified: Pebble = { ...basePebble, id: "p2", status: "VERIFIED", verifiedAt: new Date() };
    render(<AdminPebbles pebbles={[verified]} pebblePhotosEnabled={false} />);

    expect(screen.getByRole("button", { name: "Save location" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("48.8584")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2.2945")).toBeInTheDocument();
  });

  it("deletes a pending pebble after confirming", () => {
    confirmSpy.mockReturnValue(true);
    render(<AdminPebbles pebbles={[basePebble]} pebblePhotosEnabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Delete the pebble for Sarah (Mar 1, 2026)? This can't be undone.",
    );
    expect(deletePebbleAction).toHaveBeenCalledWith("p1", expect.any(FormData));
  });

  it("doesn't delete when the confirmation is cancelled", () => {
    confirmSpy.mockReturnValue(false);
    render(<AdminPebbles pebbles={[basePebble]} pebblePhotosEnabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deletePebbleAction).not.toHaveBeenCalled();
  });

  it("shows a delete control for verified pebbles too", () => {
    confirmSpy.mockReturnValue(true);
    const verified: Pebble = { ...basePebble, id: "p2", status: "VERIFIED", verifiedAt: new Date() };
    render(<AdminPebbles pebbles={[verified]} pebblePhotosEnabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deletePebbleAction).toHaveBeenCalledWith("p2", expect.any(FormData));
  });

  it("shows remove photo controls when the feature is enabled and photoUrl exists", () => {
    const withPhoto: Pebble = {
      ...basePebble,
      id: "p2",
      status: "VERIFIED",
      verifiedAt: new Date(),
      photoUrl: "https://blob.example/photo.webp",
    };

    render(<AdminPebbles pebbles={[withPhoto]} pebblePhotosEnabled={true} />);

    expect(screen.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
  });

  it("hides remove photo controls when the feature is disabled, even with a photoUrl", () => {
    const withPhoto: Pebble = {
      ...basePebble,
      id: "p2",
      status: "VERIFIED",
      verifiedAt: new Date(),
      photoUrl: "https://blob.example/photo.webp",
    };

    render(<AdminPebbles pebbles={[withPhoto]} pebblePhotosEnabled={false} />);

    expect(screen.queryByRole("button", { name: "Remove photo" })).not.toBeInTheDocument();
  });

  it("renders the add-pebble form", () => {
    render(<AdminPebbles pebbles={[]} pebblePhotosEnabled={false} />);

    expect(screen.getByText("Add pebble form")).toBeInTheDocument();
  });
});
