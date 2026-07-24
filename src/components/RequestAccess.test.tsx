import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestAccess } from "./RequestAccess";

const getPendingAccessRequest = vi.fn();

vi.mock("@/lib/access-requests", () => ({
  getPendingAccessRequest: (...args: unknown[]) => getPendingAccessRequest(...args),
}));

vi.mock("@/components/RequestAccessButton", () => ({
  RequestAccessButton: () => <div data-testid="request-access-button" />,
}));

beforeEach(() => {
  getPendingAccessRequest.mockReset();
});

describe("RequestAccess", () => {
  it("shows the request button when there's no pending request", async () => {
    getPendingAccessRequest.mockResolvedValue(null);

    render(await RequestAccess({ email: "shane@example.com", name: "Shane" }));

    expect(screen.getByText(/shane@example.com/)).toBeInTheDocument();
    expect(screen.getByTestId("request-access-button")).toBeInTheDocument();
  });

  it("shows a pending message instead of the button when a request already exists", async () => {
    getPendingAccessRequest.mockResolvedValue({ id: "r1", status: "PENDING" });

    render(await RequestAccess({ email: "shane@example.com", name: null }));

    expect(screen.getByRole("status")).toHaveTextContent(/pending/i);
    expect(screen.queryByTestId("request-access-button")).not.toBeInTheDocument();
  });
});
