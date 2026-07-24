import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageUsers } from "./ManageUsers";
import type { AllowedUser, AccessRequest } from "@prisma/client";

vi.mock("@/app/admin/actions", () => ({
  approveAccessRequestAction: vi.fn(),
  denyAccessRequestAction: vi.fn(),
  addAllowedUserAction: vi.fn(),
  removeAllowedUserAction: vi.fn(),
  toggleAllowedUserAdminAction: vi.fn(),
}));

const baseUser: AllowedUser = {
  id: "u1",
  email: "shane@example.com",
  name: "Shane",
  isAdmin: false,
  createdAt: new Date(),
};

const baseRequest: AccessRequest = {
  id: "r1",
  email: "nobody@example.com",
  name: "Nobody",
  status: "PENDING",
  requestedAt: new Date(),
  resolvedAt: null,
  resolvedByEmail: null,
  note: null,
};

describe("ManageUsers", () => {
  it("shows a message when there are no pending requests", () => {
    render(<ManageUsers allowedUsers={[]} pendingRequests={[]} />);

    expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
  });

  it("lists pending requests with approve/deny controls", () => {
    render(<ManageUsers allowedUsers={[]} pendingRequests={[baseRequest]} />);

    expect(screen.getByText(/Nobody — nobody@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deny" })).toBeInTheDocument();
  });

  it("lists allowed users, showing admin status and a toggle", () => {
    render(<ManageUsers allowedUsers={[baseUser]} pendingRequests={[]} />);

    expect(screen.getByText(/Shane — shane@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make admin" })).toBeInTheDocument();
  });

  it("shows 'Remove admin' for an existing admin", () => {
    render(<ManageUsers allowedUsers={[{ ...baseUser, isAdmin: true }]} pendingRequests={[]} />);

    expect(screen.getByText(/\(admin\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove admin" })).toBeInTheDocument();
  });

  it("renders the add-user form", () => {
    render(<ManageUsers allowedUsers={[]} pendingRequests={[]} />);

    expect(screen.getByPlaceholderText("email@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add user" })).toBeInTheDocument();
  });
});
