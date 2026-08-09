import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AdminAddPebbleForm } from "./AdminAddPebbleForm";
import { FeatureFlagsProvider } from "@/components/FeatureFlagsProvider";
import type { DynamicFeatureFlags } from "@/lib/dynamic-feature-flags";

const addPebbleAction = vi.fn();

vi.mock("@/app/admin/actions", () => ({
  addPebbleAction: (...args: unknown[]) => addPebbleAction(...args),
}));

const uploadRawPebblePhoto = vi.fn();
vi.mock("@/lib/pebble-photo-client-upload", () => ({
  uploadRawPebblePhoto: (...args: unknown[]) => uploadRawPebblePhoto(...args),
}));

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useMapsLibrary: () => undefined,
}));

const OFF_FLAGS: DynamicFeatureFlags = { map: false, submitPebble: false, pebblePhotos: false };

function renderForm(flags: Partial<DynamicFeatureFlags> = {}) {
  return render(
    <FeatureFlagsProvider flags={{ ...OFF_FLAGS, ...flags }}>
      <AdminAddPebbleForm />
    </FeatureFlagsProvider>,
  );
}

beforeEach(() => {
  addPebbleAction.mockReset();
  addPebbleAction.mockResolvedValue({ status: "idle" });
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AdminAddPebbleForm", () => {
  it("renders a field for each pebble attribute plus an add button", () => {
    renderForm();

    expect(screen.getByText("Latitude")).toBeInTheDocument();
    expect(screen.getByText("Longitude")).toBeInTheDocument();
    expect(screen.getByText("Deposited by")).toBeInTheDocument();
    expect(screen.getByText("Date deposited")).toBeInTheDocument();
    expect(screen.queryByLabelText("Photo (optional)")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add pebble/i })).toBeInTheDocument();
  });

  it("shows the optional photo input when the photo feature is enabled", () => {
    renderForm({ pebblePhotos: true });

    expect(screen.getByLabelText("Photo (optional)")).toBeInTheDocument();
  });

  it("disables submit while a selected photo is still uploading", async () => {
    let resolveUpload: (url: string) => void;
    uploadRawPebblePhoto.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveUpload = resolve;
      }),
    );
    renderForm({ pebblePhotos: true });

    fireEvent.change(screen.getByLabelText("Photo (optional)"), {
      target: {
        files: [new File([new Uint8Array(32)], "tim.jpg", { type: "image/jpeg" })],
      },
    });

    expect(await screen.findByText("Uploading photo…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add pebble/i })).toBeDisabled();

    resolveUpload!("https://blob.example/pebbles-raw/tim.jpg?download=1");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /add pebble/i })).not.toBeDisabled(),
    );
  });

  it("shows field errors returned by the action", async () => {
    addPebbleAction.mockResolvedValue({
      status: "error",
      errors: { latitude: "Enter a latitude between -90 and 90." },
    });
    const { container } = renderForm();

    fireEvent.submit(container.querySelector("form")!);

    expect(
      await screen.findByText("Enter a latitude between -90 and 90."),
    ).toBeInTheDocument();
  });

  it("shows a confirmation and keeps the form visible on success", async () => {
    addPebbleAction.mockResolvedValue({ status: "success" });
    const { container } = renderForm();

    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("status")).toHaveTextContent(/pebble added/i);
    expect(screen.getByRole("button", { name: /add pebble/i })).toBeInTheDocument();
  });

  it("doesn't render the lookup UI when no Maps API key is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
    renderForm();

    expect(screen.queryByRole("button", { name: /look up/i })).not.toBeInTheDocument();
  });
});
