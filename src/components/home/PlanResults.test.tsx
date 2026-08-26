import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PlanRequestPlanSummary } from "@/types";

import { PlanResults } from "./PlanResults";

const PLAN: PlanRequestPlanSummary = {
  id: 7,
  title: "Tarde de vinos sin manejar",
  estimatedTotalDuration: 300,
  estimatedTotalCost: 24000,
  averageRating: 4.5,
  distanceKm: 12.4,
  categories: [{ id: 1, name: "Vinos" }],
} as PlanRequestPlanSummary;

/**
 * CU17 requires a generated plan to be acceptable, adjustable or
 * discardable. These assert each of the three, because "the buttons are
 * on screen" and "the buttons do the right thing" are different claims.
 */
describe("PlanResults (CU17)", () => {
  it("accepts a plan by linking to its detail view", () => {
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    const link = screen.getByRole("link", { name: /tarde de vinos sin manejar/i });
    expect(link).toHaveAttribute("href", "/plans/7");
    expect(screen.getByText("Elegir este plan")).toBeInTheDocument();
  });

  it("offers adjusting the search and reports it", async () => {
    const user = userEvent.setup();
    const onAdjust = vi.fn();
    render(<PlanResults plans={[PLAN]} onAdjust={onAdjust} onDiscard={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /ajustar la búsqueda/i }));

    expect(onAdjust).toHaveBeenCalledOnce();
  });

  it("offers discarding the result", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={onDiscard} />);

    await user.click(screen.getByRole("button", { name: /descartar/i }));

    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("hides adjusting when there is no query to adjust", () => {
    // A surprise plan was never a sentence, so there is nothing to edit.
    render(
      <PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={vi.fn()} canAdjust={false} />,
    );

    expect(screen.queryByRole("button", { name: /ajustar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /descartar/i })).toBeInTheDocument();
  });

  it("still offers a way forward when the backend returned no plans", async () => {
    const user = userEvent.setup();
    const onAdjust = vi.fn();
    render(<PlanResults plans={[]} onAdjust={onAdjust} onDiscard={vi.fn()} />);

    expect(screen.getByText(/no encontramos un plan/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ajustar la idea/i }));
    expect(onAdjust).toHaveBeenCalledOnce();
  });
});
