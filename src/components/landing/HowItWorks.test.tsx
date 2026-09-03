import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HowItWorks } from "./HowItWorks";
import { HOW, SHOWCASE } from "./landingContent";

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

const CHOSEN =
  SHOWCASE.plans.find((plan) => plan.id === HOW.chosenId) ?? SHOWCASE.plans[0];

describe("HowItWorks", () => {
  it("keeps both halves of the headline in the scrubbed scene", () => {
    stubMatchMedia(null);

    render(<HowItWorks />);

    expect(
      screen.getByRole("heading", { level: 2, name: /Cuatro pasos/ }),
    ).toHaveTextContent("Sólo el primero es tuyo.");
  });

  it("writes the example phrase into the composer replica", () => {
    stubMatchMedia(null);

    render(<HowItWorks />);

    expect(screen.getByText(HOW.phrase)).toBeInTheDocument();
    // The replica must not be a real control — nothing to type into.
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("shows the four step labels and the three recorridos", () => {
    stubMatchMedia(null);

    render(<HowItWorks />);

    // One step marker is on screen at a time; step 0 first.
    expect(screen.getByText(HOW.steps[0].label)).toBeInTheDocument();

    for (const option of [HOW.options[0], CHOSEN, HOW.options[1]]) {
      expect(
        screen.getByRole("heading", { level: 3, name: option.title }),
      ).toBeInTheDocument();
    }
  });

  it("marks exactly the chosen recorrido, and it is a real showcase plan", () => {
    stubMatchMedia(null);

    const { container } = render(<HowItWorks />);

    const chosen = container.querySelectorAll("[data-chosen='true']");
    expect(chosen).toHaveLength(1);
    expect(chosen[0].textContent).toContain(CHOSEN.title);
    expect(SHOWCASE.plans[0].id).toBe(HOW.chosenId);
  });

  it("carries a screen-reader equivalent of the whole sequence", () => {
    stubMatchMedia(null);

    const { container } = render(<HowItWorks />);

    const summary = container.querySelector(".sp-sr-only");
    expect(summary?.textContent).toContain("Escribís una frase");
    expect(summary?.textContent).toContain("el primero");
  });

  it("drops the pin on narrow viewports", async () => {
    stubMatchMedia("(max-width: 900px)");

    const { container } = render(<HowItWorks />);

    await waitFor(() =>
      expect(container.querySelector("[data-static='true']")).toBeInTheDocument(),
    );
    expect(container.querySelector("[class*='track']")).toBeNull();
    expect(screen.getByText(HOW.phrase)).toBeInTheDocument();
    expect(screen.getByText(HOW.steps[3].label)).toBeInTheDocument();
  });

  it("drops the pin under reduced motion", async () => {
    stubMatchMedia("(prefers-reduced-motion: reduce)");

    const { container } = render(<HowItWorks />);

    await waitFor(() =>
      expect(container.querySelector("[data-static='true']")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: /Cuatro pasos/ }),
    ).toBeInTheDocument();
  });
});
