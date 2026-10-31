import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { downloadMedia } from "@/lib/api/media";

import { AuthenticatedImage } from "./AuthenticatedImage";

vi.mock("@/lib/api/media", () => ({ downloadMedia: vi.fn() }));

const googlePhoto = {
  blob: new Blob(["photo"], { type: "image/jpeg" }),
  attribution: {
    provider: "google_maps" as const,
    authors: [
      { displayName: "Ana Pérez", uri: "https://maps.google.com/contrib/ana" },
      { displayName: "Sin perfil", uri: null },
    ],
  },
};

describe("AuthenticatedImage (SmartPlan-back#102)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:photo"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("shows an uploaded image without any provider credit", async () => {
    vi.mocked(downloadMedia).mockResolvedValue({
      blob: googlePhoto.blob,
      attribution: null,
    });

    render(<AuthenticatedImage url="/api/media/plan/3" alt="Bodega" />);

    expect(await screen.findByRole("img", { name: "Bodega" })).toHaveAttribute(
      "src",
      "blob:photo",
    );
    expect(screen.queryByText("Google Maps")).toBeNull();
  });

  it("always names Google Maps on a provider photo, without authors in a thumbnail", async () => {
    vi.mocked(downloadMedia).mockResolvedValue(googlePhoto);

    render(
      <AuthenticatedImage url="/api/activity-places/7/photo" alt="Bodega" />,
    );

    expect(await screen.findByText("Google Maps")).toHaveAttribute(
      "translate",
      "no",
    );
    expect(screen.queryByText("Ana Pérez")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links every author where the photo is shown in full", async () => {
    vi.mocked(downloadMedia).mockResolvedValue(googlePhoto);

    render(
      <AuthenticatedImage
        url="/api/activity-places/7/photo"
        alt="Bodega"
        attribution="full"
      />,
    );

    const author = await screen.findByRole("link", { name: "Ana Pérez" });
    expect(author).toHaveAttribute(
      "href",
      "https://maps.google.com/contrib/ana",
    );
    expect(author).toHaveAttribute("rel", "noopener noreferrer");
    expect(author).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/Sin perfil/)).toBeInTheDocument();
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
  });

  it("leaves the credit to the caller when asked to draw it outside", async () => {
    vi.mocked(downloadMedia).mockResolvedValue(googlePhoto);

    render(
      <AuthenticatedImage
        url="/api/activity-places/7/photo"
        alt=""
        attribution="external"
      />,
    );

    await screen.findByRole("presentation");
    expect(screen.queryByText("Google Maps")).toBeNull();
  });

  it("draws the placeholder without asking the API when there is no image", () => {
    render(<AuthenticatedImage url={null} alt="Bodega" />);

    expect(
      screen.getByRole("img", { name: "Sin imagen de Bodega" }),
    ).toBeInTheDocument();
    expect(downloadMedia).not.toHaveBeenCalled();
  });

  it("falls back when the provider has no photo or fails", async () => {
    vi.mocked(downloadMedia).mockRejectedValue(
      new Error("404 PLACE_PHOTO_NOT_FOUND"),
    );

    render(
      <AuthenticatedImage
        url="/api/activity-places/7/photo"
        alt="Bodega"
        fallback={<p>Arte del plan</p>}
      />,
    );

    expect(await screen.findByText("Arte del plan")).toBeInTheDocument();
    expect(screen.queryByText("Google Maps")).toBeNull();
  });

  it("shows the neutral placeholder on failure when no fallback is given", async () => {
    vi.mocked(downloadMedia).mockRejectedValue(new Error("429"));

    render(
      <AuthenticatedImage url="/api/activity-places/7/photo" alt="Bodega" />,
    );

    expect(
      await screen.findByRole("img", { name: "Sin imagen de Bodega" }),
    ).toBeInTheDocument();
  });

  it("uses initials while loading and on a browser decode error, then recovers with a replacement URL", async () => {
    vi.mocked(downloadMedia).mockResolvedValue({
      blob: googlePhoto.blob,
      attribution: null,
    });
    const view = render(
      <AuthenticatedImage
        url="/api/media/avatar/1"
        alt="Avatar"
        fallback="AP"
        loadingFallback="AP"
      />,
    );
    expect(screen.getByText("AP")).toBeInTheDocument();
    const image = await screen.findByRole("img", { name: "Avatar" });
    fireEvent.error(image);
    expect(screen.getByText("AP")).toBeInTheDocument();
    view.rerender(
      <AuthenticatedImage
        url="/api/media/avatar/2"
        alt="Avatar"
        fallback="AP"
        loadingFallback="AP"
      />,
    );
    expect(screen.getByText("AP")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Avatar" })).toHaveAttribute(
      "src",
      "blob:photo",
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });

  it("ignores a slow obsolete download after the avatar changes", async () => {
    let finish!: (download: { blob: Blob; attribution: null }) => void;
    vi.mocked(downloadMedia)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      )
      .mockResolvedValueOnce({ blob: googlePhoto.blob, attribution: null });
    const view = render(
      <AuthenticatedImage url="/api/media/avatar/1" alt="Avatar" />,
    );
    view.rerender(
      <AuthenticatedImage url="/api/media/avatar/2" alt="Avatar" />,
    );
    await screen.findByRole("img", { name: "Avatar" });
    await act(async () => {
      finish({ blob: new Blob(["old"]), attribution: null });
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("revokes a loaded avatar and restores the fallback when its URL is removed", async () => {
    vi.mocked(downloadMedia).mockResolvedValue({
      blob: googlePhoto.blob,
      attribution: null,
    });
    const view = render(
      <AuthenticatedImage
        url="/api/media/avatar/1"
        alt="Avatar"
        fallback="AP"
      />,
    );
    await screen.findByRole("img", { name: "Avatar" });
    view.rerender(<AuthenticatedImage url={null} alt="Avatar" fallback="AP" />);
    expect(screen.getByText("AP")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Avatar" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo"),
    );
  });
});
