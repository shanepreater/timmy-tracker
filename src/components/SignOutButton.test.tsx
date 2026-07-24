import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignOutButton } from "./SignOutButton";

vi.mock("@/app/actions/sign-out", () => ({ signOutAction: vi.fn() }));

describe("SignOutButton", () => {
  it("renders a sign-out button", () => {
    render(<SignOutButton />);

    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
