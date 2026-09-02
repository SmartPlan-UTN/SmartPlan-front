import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InspirationGallery } from "./InspirationGallery";
import { INSPIRATION } from "./landingContent";

afterEach(() => vi.unstubAllGlobals());

function stubMatchMedia(matching: string | null) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === matching,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("InspirationGallery", () => {
  it("renders the headline and every photograph in the scrubbed scene", () => {
    stubMatchMedia(null);

    render(<InspirationGallery />);

    expect(
      screen.getByRole("heading", { name: /No hace falta saber/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(INSPIRATION.lead)).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(INSPIRATION.tiles.length);
  });

  it("labels every photograph except the lead", () => {
    stubMatchMedia(null);

    render(<InspirationGallery />);

    // The lead's text is the headline; a label on it would be a caption.
    expect(screen.queryByText("Mesas para compartir")).not.toBeInTheDocument();
    for (const tile of INSPIRATION.tiles.slice(1)) {
      expect(screen.getByText(tile.label)).toBeInTheDocument();
    }
  });

  it("drops the pin on narrow viewports", async () => {
    stubMatchMedia("(max-width: 900px)");

    const { container } = render(<InspirationGallery />);

    await waitFor(() =>
      expect(container.querySelector("[class*='staticScene']")).toBeInTheDocument(),
    );
    expect(container.querySelector("[class*='track']")).toBeNull();
    // Every photograph is still there, and now every one carries its label.
    expect(screen.getAllByRole("img")).toHaveLength(INSPIRATION.tiles.length);
    expect(screen.getByText("Mesas para compartir")).toBeInTheDocument();
  });

  it("drops the pin under reduced motion", async () => {
    stubMatchMedia("(prefers-reduced-motion: reduce)");

    const { container } = render(<InspirationGallery />);

    await waitFor(() =>
      expect(container.querySelector("[class*='staticScene']")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: /No hace falta saber/ }),
    ).toBeInTheDocument();
  });
});
