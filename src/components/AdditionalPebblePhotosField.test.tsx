import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdditionalPebblePhotosField } from "./AdditionalPebblePhotosField";

const uploadRawPebblePhoto = vi.fn();
vi.mock("@/lib/pebble-photo-client-upload", () => ({
  uploadRawPebblePhoto: (...args: unknown[]) => uploadRawPebblePhoto(...args),
}));

beforeEach(() => {
  uploadRawPebblePhoto.mockReset();
});

function makeFile(options: { name?: string; type?: string; size?: number } = {}) {
  const { name = "tim.jpg", type = "image/jpeg", size = 32 } = options;
  return new File([new Uint8Array(size)], name, { type });
}

function hiddenUrlValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[name="additionalPhotoUrls"]')).map(
    (input) => input.value,
  );
}

function pickFiles(input: HTMLElement, files: File[]) {
  fireEvent.change(input, { target: { files } });
}

describe("AdditionalPebblePhotosField", () => {
  it("renders a labeled multi-file input, mentioning the max, with no hidden fields", () => {
    const { container } = render(<AdditionalPebblePhotosField context="submit" max={3} />);

    const input = screen.getByLabelText("Additional photos (optional, up to 3)");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("multiple");
    expect(hiddenUrlValues(container)).toEqual([]);
  });

  it("rejects an invalid file immediately, without uploading", async () => {
    const { container } = render(<AdditionalPebblePhotosField context="submit" max={3} />);

    pickFiles(screen.getByLabelText(/additional photos/i), [makeFile({ type: "image/gif" })]);

    expect(await screen.findByText("Upload a JPG, PNG, or WebP image.")).toBeInTheDocument();
    expect(uploadRawPebblePhoto).not.toHaveBeenCalled();
    expect(hiddenUrlValues(container)).toEqual([]);
  });

  it("uploads every selected file and fills a hidden field per successful upload", async () => {
    uploadRawPebblePhoto
      .mockResolvedValueOnce("https://blob.example/pebbles-raw/a.jpg")
      .mockResolvedValueOnce("https://blob.example/pebbles-raw/b.jpg");
    const onUploadingChange = vi.fn();
    const { container } = render(
      <AdditionalPebblePhotosField context="submit" max={3} onUploadingChange={onUploadingChange} />,
    );
    const fileA = makeFile({ name: "a.jpg" });
    const fileB = makeFile({ name: "b.jpg" });

    pickFiles(screen.getByLabelText(/additional photos/i), [fileA, fileB]);

    expect(onUploadingChange).toHaveBeenCalledWith(true);
    expect(uploadRawPebblePhoto).toHaveBeenCalledWith(fileA, "submit");
    expect(uploadRawPebblePhoto).toHaveBeenCalledWith(fileB, "submit");

    await waitFor(() =>
      expect(hiddenUrlValues(container).sort()).toEqual(
        ["https://blob.example/pebbles-raw/a.jpg", "https://blob.example/pebbles-raw/b.jpg"].sort(),
      ),
    );

    // The onUploadingChange(false) call runs in a useEffect after the
    // render commits — wait for it rather than assuming it has fired by
    // the time the hidden URLs appear in the DOM.
    await waitFor(() => expect(onUploadingChange).toHaveBeenLastCalledWith(false));
  });

  it("accumulates slots across repeated selections instead of replacing them", async () => {
    uploadRawPebblePhoto
      .mockResolvedValueOnce("https://blob.example/pebbles-raw/a.jpg")
      .mockResolvedValueOnce("https://blob.example/pebbles-raw/b.jpg");
    const { container } = render(<AdditionalPebblePhotosField context="submit" max={5} />);
    const input = screen.getByLabelText(/additional photos/i);

    pickFiles(input, [makeFile({ name: "a.jpg" })]);
    await waitFor(() => expect(hiddenUrlValues(container)).toHaveLength(1));

    pickFiles(input, [makeFile({ name: "b.jpg" })]);
    await waitFor(() => expect(hiddenUrlValues(container)).toHaveLength(2));

    expect(hiddenUrlValues(container).sort()).toEqual(
      ["https://blob.example/pebbles-raw/a.jpg", "https://blob.example/pebbles-raw/b.jpg"].sort(),
    );
  });

  it("caps a single over-sized selection to the remaining room", async () => {
    uploadRawPebblePhoto.mockResolvedValue("https://blob.example/pebbles-raw/x.jpg");
    render(<AdditionalPebblePhotosField context="submit" max={2} />);

    pickFiles(screen.getByLabelText(/additional photos/i), [
      makeFile({ name: "a.jpg" }),
      makeFile({ name: "b.jpg" }),
      makeFile({ name: "c.jpg" }),
    ]);

    await waitFor(() => expect(uploadRawPebblePhoto).toHaveBeenCalledTimes(2));
  });

  it("disables the input once max slots are filled", async () => {
    uploadRawPebblePhoto.mockResolvedValue("https://blob.example/pebbles-raw/a.jpg");
    render(<AdditionalPebblePhotosField context="submit" max={1} />);
    const input = screen.getByLabelText(/additional photos/i);

    pickFiles(input, [makeFile({ name: "a.jpg" })]);

    await waitFor(() => expect(input).toBeDisabled());
  });

  it("removes a slot's hidden field when its Remove button is clicked", async () => {
    uploadRawPebblePhoto.mockResolvedValue("https://blob.example/pebbles-raw/a.jpg");
    const { container } = render(<AdditionalPebblePhotosField context="submit" max={3} />);

    pickFiles(screen.getByLabelText(/additional photos/i), [makeFile({ name: "a.jpg" })]);
    await waitFor(() => expect(hiddenUrlValues(container)).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(hiddenUrlValues(container)).toEqual([]);
  });

  it("shows a per-slot error and doesn't add a hidden field when an upload fails", async () => {
    uploadRawPebblePhoto.mockRejectedValue(new Error("network error"));
    const { container } = render(<AdditionalPebblePhotosField context="admin" max={3} />);

    pickFiles(screen.getByLabelText(/additional photos/i), [makeFile({ name: "a.jpg" })]);

    expect(await screen.findByText("Upload failed. Try a different file.")).toBeInTheDocument();
    expect(hiddenUrlValues(container)).toEqual([]);
  });
});
