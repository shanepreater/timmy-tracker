import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

vi.mock("@/components/SignOutButton", () => ({
  SignOutButton: () => <button type="button">Sign out</button>,
}));

describe("AppHeader", () => {
  it("shows the signed-in email", () => {
    render(<AppHeader email="shane@example.com" isAdmin={false} />);

    expect(screen.getByText("shane@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
  });

  it("shows an admin link when isAdmin is true", () => {
    render(<AppHeader email="shane@example.com" isAdmin={true} />);

    expect(screen.getByRole("link", { name: /admin/i })).toHaveAttribute("href", "/admin");
  });
});
