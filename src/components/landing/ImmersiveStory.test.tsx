import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImmersiveStory } from "./ImmersiveStory";

afterEach(() => vi.unstubAllGlobals());

function stubCompact() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(max-width: 900px)",
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

describe("ImmersiveStory", () => {
  it("uses the compact static composition on narrow viewports", async () => {
    stubCompact();

    const { container } = render(<ImmersiveStory />);

    await waitFor(() =>
      expect(container.querySelector("[data-static='true']")).toBeInTheDocument(),
    );

    // The recorrido is real content, not a canvas: every stop is in the DOM.
    expect(screen.getByText("Atardecer")).toBeInTheDocument();
    expect(screen.getByText("Cena compartida")).toBeInTheDocument();
    expect(screen.getByText("Sobremesa")).toBeInTheDocument();

    // Nothing pinned or scrubbed survives into the static layout.
    expect(container.querySelector("[class*='track']")).toBeNull();
    expect(container.querySelector("[class*='warm']")).toBeNull();
  });

  it("splits the headline across the section and keeps both halves", () => {
    const { container } = render(<ImmersiveStory />);

    expect(
      screen.getByRole("heading", { name: "Las ganas no vienen ordenadas." }),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("El plan sí.");
  });

  /**
   * The transformation the section is built on: each surviving intention and
   * the stop it becomes are the same element, so both texts have to be
   * present in one caption. If they were ever split apart again, the word
   * would go back to vanishing and an unrelated photograph appearing.
   */
  it("keeps each surviving intention inside the moment it becomes", () => {
    const { container } = render(<ImmersiveStory />);

    const pairs: [string, string][] = [
      ["atardecer", "Atardecer"],
      ["buena comida", "Cena compartida"],
      ["sobremesa", "Sobremesa"],
    ];

    for (const [intention, resolved] of pairs) {
      const caption = Array.from(
        container.querySelectorAll("[class*='caption']"),
      ).find((node) => node.textContent?.includes(resolved));

      expect(caption, `no caption resolved to "${resolved}"`).toBeDefined();
      expect(caption?.textContent).toContain(intention);
    }
  });

  it("never paints a dark ground or a gradient hand-off", () => {
    const { container } = render(<ImmersiveStory />);

    expect(container.querySelector("[class*='dusk']")).toBeNull();
    expect(container.querySelector("[class*='tail']")).toBeNull();
  });

  it("carries a text equivalent of the scene for screen readers", () => {
    const { container } = render(<ImmersiveStory />);

    const summary = container.querySelector(".sp-sr-only");
    expect(summary).toBeInTheDocument();
    expect(summary?.textContent).toContain("Ocho ganas sueltas");
    expect(summary?.textContent).toContain("un recorrido");
  });
});
