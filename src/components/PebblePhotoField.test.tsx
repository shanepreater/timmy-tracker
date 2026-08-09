import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PebblePhotoField } from "./PebblePhotoField";

const uploadRawPebblePhoto = vi.fn();
vi.mock("@/lib/pebble-photo-client-upload", () => ({
  uploadRawPebblePhoto: (...args: unknown[]) => uploadRawPebblePhoto(...args),
}));

function makeFile(options: { name?: string; type?: string; size?: number } = {}) {
  const { name = "tim.jpg", type = "image/jpeg", size = 32 } = options;
  return new File([new Uint8Array(size)], name, { type });
}

function rawPhotoUrlValue(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>('input[name="rawPhotoUrl"]')!.value;
}

describe("PebblePhotoField", () => {
  it("renders a labeled file input and an empty hidden rawPhotoUrl field", () => {
    const { container } = render(<PebblePhotoField context="submit" />);

    expect(screen.getByLabelText("Photo (optional)")).toBeInTheDocument();
    expect(rawPhotoUrlValue(container)).toBe("");
  });

  it("rejects an invalid file immediately, without uploading", async () => {
    const { container } = render(<PebblePhotoField context="submit" />);

    fireEvent.change(screen.getByLabelText("Photo (optional)"), {
      target: { files: [makeFile({ type: "image/gif" })] },
    });

    expect(await screen.findByText("Upload a JPG, PNG, or WebP image.")).toBeInTheDocument();
    expect(uploadRawPebblePhoto).not.toHaveBeenCalled();
    expect(rawPhotoUrlValue(container)).toBe("");
  });

  it("uploads on selection and fills the hidden field once it completes", async () => {
    let resolveUpload: (url: string) => void;
    uploadRawPebblePhoto.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const onUploadingChange = vi.fn();
    const { container } = render(
      <PebblePhotoField context="submit" onUploadingChange={onUploadingChange} />,
    );
    const file = makeFile();

    fireEvent.change(screen.getByLabelText("Photo (optional)"), { target: { files: [file] } });

    expect(await screen.findByText("Uploading photo…")).toBeInTheDocument();
    expect(uploadRawPebblePhoto).toHaveBeenCalledWith(file, "submit");
    expect(onUploadingChange).toHaveBeenCalledWith(true);

    resolveUpload!("https://blob.example/pebbles-raw/tim.jpg?download=1");

    await waitFor(() =>
      expect(rawPhotoUrlValue(container)).toBe(
        "https://blob.example/pebbles-raw/tim.jpg?download=1",
      ),
    );
    expect(screen.queryByText("Uploading photo…")).not.toBeInTheDocument();
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  });

  it("shows an error and leaves the hidden field empty when the upload fails", async () => {
    uploadRawPebblePhoto.mockRejectedValue(new Error("network error"));
    const { container } = render(<PebblePhotoField context="admin" />);

    fireEvent.change(screen.getByLabelText("Photo (optional)"), {
      target: { files: [makeFile()] },
    });

    expect(await screen.findByText("Upload failed. Try a different file.")).toBeInTheDocument();
    expect(rawPhotoUrlValue(container)).toBe("");
  });

  it("shows a server-side error alongside any client validation state", () => {
    render(<PebblePhotoField context="submit" error="We couldn't process that image." />);

    expect(screen.getByText("We couldn't process that image.")).toBeInTheDocument();
  });
});
