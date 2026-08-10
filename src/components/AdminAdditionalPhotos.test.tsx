import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAdditionalPhotos } from "./AdminAdditionalPhotos";
import type { PebbleAdditionalPhotoRecord } from "@/lib/pebble-additional-photos";

const addAdditionalPebblePhotosAction = vi.fn();
const removeAdditionalPebblePhotoAction = vi.fn();
const uploadRawPebblePhoto = vi.fn();

vi.mock("@/app/admin/actions", () => ({
  addAdditionalPebblePhotosAction: (...args: unknown[]) => addAdditionalPebblePhotosAction(...args),
  removeAdditionalPebblePhotoAction: (...args: unknown[]) => removeAdditionalPebblePhotoAction(...args),
}));
vi.mock("@/lib/pebble-photo-client-upload", () => ({
  uploadRawPebblePhoto: (...args: unknown[]) => uploadRawPebblePhoto(...args),
}));

const photo: PebbleAdditionalPhotoRecord = {
  id: "ph1",
  url: "https://blob.example/extra-a.webp",
  position: 0,
};

describe("AdminAdditionalPhotos", () => {
  const confirmSpy = vi.spyOn(window, "confirm");

  beforeEach(() => {
    addAdditionalPebblePhotosAction.mockReset();
    removeAdditionalPebblePhotoAction.mockReset();
    uploadRawPebblePhoto.mockReset();
    confirmSpy.mockReset();
  });

  it("renders no thumbnails and shows the add form when there are no photos yet", () => {
    render(<AdminAdditionalPhotos pebbleId="p1" photos={[]} max={5} />);

    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/additional photos/i)).toBeInTheDocument();
  });

  it("lists existing photos as thumbnails with individual remove controls", () => {
    render(<AdminAdditionalPhotos pebbleId="p1" photos={[photo]} max={5} />);

    expect(screen.getByRole("img", { name: "Additional pebble photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("removes a photo after confirming", () => {
    confirmSpy.mockReturnValue(true);
    render(<AdminAdditionalPhotos pebbleId="p1" photos={[photo]} max={5} />);

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(removeAdditionalPebblePhotoAction).toHaveBeenCalledWith("ph1", expect.any(FormData));
  });

  it("doesn't remove a photo when the confirmation is declined", () => {
    confirmSpy.mockReturnValue(false);
    render(<AdminAdditionalPhotos pebbleId="p1" photos={[photo]} max={5} />);

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(removeAdditionalPebblePhotoAction).not.toHaveBeenCalled();
  });

  it("offers the add-more field with room for what's left, not the full max", () => {
    render(<AdminAdditionalPhotos pebbleId="p1" photos={[photo]} max={2} />);

    expect(screen.getByLabelText("Additional photos (optional, up to 1)")).toBeInTheDocument();
  });

  it("hides the add-more form once the pebble is at its max", () => {
    render(<AdminAdditionalPhotos pebbleId="p1" photos={[photo]} max={1} />);

    expect(screen.queryByLabelText(/additional photos/i)).not.toBeInTheDocument();
  });

  it("disables the Add button while a selected photo is still uploading", async () => {
    let resolveUpload: (url: string) => void;
    uploadRawPebblePhoto.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveUpload = resolve;
      }),
    );
    render(<AdminAdditionalPhotos pebbleId="p1" photos={[]} max={5} />);

    fireEvent.change(screen.getByLabelText(/additional photos/i), {
      target: { files: [new File([new Uint8Array(32)], "tim.jpg", { type: "image/jpeg" })] },
    });

    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    resolveUpload!("https://blob.example/pebbles-raw/tim.jpg");

    await waitFor(() => expect(screen.getByRole("button", { name: "Add" })).not.toBeDisabled());
  });

  it("submits the uploaded urls to addAdditionalPebblePhotosAction bound to the pebble id", async () => {
    uploadRawPebblePhoto.mockResolvedValue("https://blob.example/pebbles-raw/tim.jpg");
    render(<AdminAdditionalPhotos pebbleId="p1" photos={[]} max={5} />);

    fireEvent.change(screen.getByLabelText(/additional photos/i), {
      target: { files: [new File([new Uint8Array(32)], "tim.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Add" })).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(addAdditionalPebblePhotosAction).toHaveBeenCalledWith("p1", expect.any(FormData));
  });
});
