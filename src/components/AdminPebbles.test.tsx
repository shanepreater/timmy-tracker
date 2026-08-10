import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPebbles } from "./AdminPebbles";
import type { PebbleWithPhotos } from "@/lib/pebbles";

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

vi.mock("@/components/AdminAdditionalPhotos", () => ({
  AdminAdditionalPhotos: ({ pebbleId }: { pebbleId: string }) => (
    <div data-testid={`admin-additional-photos-${pebbleId}`} />
  ),
}));

const basePebble: PebbleWithPhotos = {
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
  additionalPhotos: [],
};

function renderAdminPebbles(
  pebbles: PebbleWithPhotos[],
  pebblePhotosEnabled: boolean,
  maxAdditionalPhotos = 5,
) {
  return render(
    <AdminPebbles
      pebbles={pebbles}
      pebblePhotosEnabled={pebblePhotosEnabled}
      maxAdditionalPhotos={maxAdditionalPhotos}
    />,
  );
}

describe("AdminPebbles", () => {
  const confirmSpy = vi.spyOn(window, "confirm");

  beforeEach(() => {
    deletePebbleAction.mockReset();
    confirmSpy.mockReset();
  });

  it("shows a message when there are no pending submissions", () => {
    renderAdminPebbles([], false);

    expect(screen.getByText(/no pending submissions/i)).toBeInTheDocument();
  });

  it("lists pending pebbles with a verify control", () => {
    renderAdminPebbles([basePebble], false);

    expect(screen.getByText(/Sarah — Mar 1, 2026/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
  });

  it("shows a message when there are no verified pebbles", () => {
    renderAdminPebbles([], false);

    expect(screen.getByText(/no verified pebbles yet/i)).toBeInTheDocument();
  });

  it("lists verified pebbles with a pre-filled move form", () => {
    const verified: PebbleWithPhotos = { ...basePebble, id: "p2", status: "VERIFIED", verifiedAt: new Date() };
    renderAdminPebbles([verified], false);

    expect(screen.getByRole("button", { name: "Save location" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("48.8584")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2.2945")).toBeInTheDocument();
  });

  it("deletes a pending pebble after confirming", () => {
    confirmSpy.mockReturnValue(true);
    renderAdminPebbles([basePebble], false);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Delete the pebble for Sarah (Mar 1, 2026)? This can't be undone.",
    );
    expect(deletePebbleAction).toHaveBeenCalledWith("p1", expect.any(FormData));
  });

  it("doesn't delete when the confirmation is cancelled", () => {
    confirmSpy.mockReturnValue(false);
    renderAdminPebbles([basePebble], false);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deletePebbleAction).not.toHaveBeenCalled();
  });

  it("shows a delete control for verified pebbles too", () => {
    confirmSpy.mockReturnValue(true);
    const verified: PebbleWithPhotos = { ...basePebble, id: "p2", status: "VERIFIED", verifiedAt: new Date() };
    renderAdminPebbles([verified], false);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deletePebbleAction).toHaveBeenCalledWith("p2", expect.any(FormData));
  });

  it("shows remove photo controls when the feature is enabled and photoUrl exists", () => {
    const withPhoto: PebbleWithPhotos = {
      ...basePebble,
      id: "p2",
      status: "VERIFIED",
      verifiedAt: new Date(),
      photoUrl: "https://blob.example/photo.webp",
    };

    renderAdminPebbles([withPhoto], true);

    expect(screen.getByRole("button", { name: "Remove primary photo" })).toBeInTheDocument();
  });

  it("hides remove photo controls when the feature is disabled, even with a photoUrl", () => {
    const withPhoto: PebbleWithPhotos = {
      ...basePebble,
      id: "p2",
      status: "VERIFIED",
      verifiedAt: new Date(),
      photoUrl: "https://blob.example/photo.webp",
    };

    renderAdminPebbles([withPhoto], false);

    expect(screen.queryByRole("button", { name: "Remove primary photo" })).not.toBeInTheDocument();
  });

  it("renders the add-pebble form", () => {
    renderAdminPebbles([], false);

    expect(screen.getByText("Add pebble form")).toBeInTheDocument();
  });

  it("shows additional-photos management for pending and verified pebbles when photos are enabled", () => {
    const verified: PebbleWithPhotos = { ...basePebble, id: "p2", status: "VERIFIED", verifiedAt: new Date() };
    renderAdminPebbles([basePebble, verified], true);

    expect(screen.getByTestId("admin-additional-photos-p1")).toBeInTheDocument();
    expect(screen.getByTestId("admin-additional-photos-p2")).toBeInTheDocument();
  });

  it("hides additional-photos management when the feature is disabled", () => {
    renderAdminPebbles([basePebble], false);

    expect(screen.queryByTestId("admin-additional-photos-p1")).not.toBeInTheDocument();
  });
});
