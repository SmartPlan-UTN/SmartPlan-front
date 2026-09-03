import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { UsePlanRequestPollingResult } from "@/hooks";

import { LandingHero } from "./LandingHero";
import { HERO } from "./landingContent";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

function polling(
  overrides: Partial<UsePlanRequestPollingResult> = {},
): UsePlanRequestPollingResult {
  return {
    phase: "idle",
    plans: null,
    failure: null,
    submit: vi.fn(),
    submitSurprise: vi.fn(),
    keepWaiting: vi.fn(),
    discard: vi.fn(),
    retry: vi.fn(),
    regenerate: vi.fn(),
    lastSubmission: null,
    applySelectionChange: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  } as UsePlanRequestPollingResult;
}

function renderHero(overrides: Partial<UsePlanRequestPollingResult> = {}) {
  const onSubmit = vi.fn();
  render(
    <LandingHero
      planning={polling(overrides)}
      sessionLoading={false}
      onSubmit={onSubmit}
      onSurprise={vi.fn()}
      onRegenerate={vi.fn()}
      onAdjust={vi.fn()}
    />,
  );
  return { onSubmit };
}

const FIELD = /contale a smartplan qué querés hacer/i;

describe("LandingHero", () => {
  it("keeps the product's headline as the page's only h1", () => {
    renderHero();

    const heading = screen.getByRole("heading", { level: 1 });
    for (const line of HERO.headline) {
      expect(heading).toHaveTextContent(line);
    }
  });

  it("keeps the hero scene decorative and outside the accessibility tree", () => {
    renderHero();

    const scene = screen.getByTestId("hero-objects");
    expect(scene).toHaveAttribute("aria-hidden", "true");
    const images = scene.querySelectorAll("img");
    expect(images.length).toBeGreaterThanOrEqual(6);
    for (const image of images) expect(image).toHaveAttribute("alt", "");

    // The ambient (vector) plane is decorative too.
    expect(screen.getByTestId("hero-ambient")).toHaveAttribute("aria-hidden", "true");
  });

  it("writes a quick intent into the composer and focuses it, without submitting", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderHero();

    await user.click(screen.getByRole("button", { name: "Aire libre" }));

    const field = screen.getByLabelText(FIELD);
    expect(field).toHaveValue("Un plan al aire libre, con caminata y buen clima");
    expect(field).toHaveFocus();
    expect(field.closest("section")).toHaveAttribute("data-writing", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("hands the written idea to the page when planning", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderHero();

    await user.type(screen.getByLabelText(FIELD), "algo tranquilo");
    await user.click(screen.getByRole("button", { name: "Planificar" }));

    expect(onSubmit).toHaveBeenCalledWith("algo tranquilo", {});
  });

  it("replaces the composer with the generation state in place", () => {
    renderHero({ phase: "processing" });

    // Same screen answering, not a route change: the field is gone and
    // nothing else on the hero survives alongside it.
    expect(screen.queryByLabelText(FIELD)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Generación de planes" })).not.toHaveAttribute("aria-labelledby");
  });
});
