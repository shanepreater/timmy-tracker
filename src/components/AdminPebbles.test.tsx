import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPebbles } from "./AdminPebbles";
import type { Pebble } from "@prisma/client";

vi.mock("@/app/admin/actions", () => ({
  verifyPebbleAction: vi.fn(),
  movePebbleAction: vi.fn(),
  removePebblePhotoAction: vi.fn(),
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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows a message when there are no pending submissions", () => {
    render(<AdminPebbles pebbles={[]} />);

    expect(screen.getByText(/no pending submissions/i)).toBeInTheDocument();
  });

  it("lists pending pebbles with a verify control", () => {
    render(<AdminPebbles pebbles={[basePebble]} />);

    expect(screen.getByText(/Sarah — Mar 1, 2026/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
  });

  it("shows a message when there are no verified pebbles", () => {
    render(<AdminPebbles pebbles={[]} />);

    expect(screen.getByText(/no verified pebbles yet/i)).toBeInTheDocument();
  });

  it("lists verified pebbles with a pre-filled move form", () => {
    const verified: Pebble = { ...basePebble, id: "p2", status: "VERIFIED", verifiedAt: new Date() };
    render(<AdminPebbles pebbles={[verified]} />);

    expect(screen.getByRole("button", { name: "Save location" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("48.8584")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2.2945")).toBeInTheDocument();
  });

  it("shows remove photo controls when the feature is enabled and photoUrl exists", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PEBBLE_PHOTOS", "true");
    const withPhoto: Pebble = {
      ...basePebble,
      id: "p2",
      status: "VERIFIED",
      verifiedAt: new Date(),
      photoUrl: "https://blob.example/photo.webp",
    };

    render(<AdminPebbles pebbles={[withPhoto]} />);

    expect(screen.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
  });

  it("renders the add-pebble form", () => {
    render(<AdminPebbles pebbles={[]} />);

    expect(screen.getByText("Add pebble form")).toBeInTheDocument();
  });
});
