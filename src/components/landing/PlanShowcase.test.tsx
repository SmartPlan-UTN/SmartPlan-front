import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlanShowcase } from "./PlanShowcase";
import { SHOWCASE } from "./landingContent";

beforeEach(() => {
  // The rail reads matchMedia on mount for its auto-advance guard.
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("PlanShowcase", () => {
  it("leads with the featured plan and rails the rest", () => {
    render(<PlanShowcase />);

    // Featured card = SHOWCASE.plans[0] (the plan the how-it-works scene hands
    // over). It is not inside the rail.
    const rail = screen.getByRole("list", { name: /ejemplos de recorridos/i });
    expect(
      within(rail).queryByText(SHOWCASE.plans[0].title),
    ).toBeNull();
    expect(screen.getByText(SHOWCASE.plans[0].title)).toBeInTheDocument();

    for (const plan of SHOWCASE.plans.slice(1)) {
      expect(within(rail).getByText(plan.title)).toBeInTheDocument();
    }
  });

  it("honours an explicit featuredId", () => {
    const target = SHOWCASE.plans[2];
    render(<PlanShowcase featuredId={target.id} />);

    const rail = screen.getByRole("list", { name: /ejemplos de recorridos/i });
    expect(within(rail).queryByText(target.title)).toBeNull();
    expect(screen.getByText(target.title)).toBeInTheDocument();
  });

  it("labels every card as an example, featured one included", () => {
    render(<PlanShowcase />);

    // One badge per plan: the featured card plus every rail card.
    expect(screen.getAllByText(SHOWCASE.badge)).toHaveLength(
      SHOWCASE.plans.length,
    );
  });
});
