import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PlanRequestPlanSummary } from "@/types";

import { PlanResults } from "./PlanResults";

const PLAN: PlanRequestPlanSummary = {
  id: 7,
  title: "Tarde de vinos sin manejar",
  description: null,
  estimatedTotalDuration: 300,
  estimatedTotalCost: 24000,
  activityCount: 2,
  averageRating: 4.5,
  distanceKm: 12.4,
  categories: [{ id: 1, name: "Vinos" }],
  activityNames: ["Degustación guiada", "Almuerzo entre viñedos"],
  status: { key: "generated", name: "Generated" },
};

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

  it("names each option's activities (CU19)", () => {
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    expect(
      screen.getByText("Degustación guiada · Almuerzo entre viñedos"),
    ).toBeInTheDocument();
  });

  it("shows at most three alternatives", () => {
    const many = Array.from({ length: 5 }, (_, index) => ({
      ...PLAN,
      id: index + 1,
      title: `Opción ${index + 1}`,
    }));
    render(<PlanResults plans={many} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});

describe("PlanResults (CU19 surprise)", () => {
  it("uses its own copy and offers regenerating from the same location", async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    render(
      <PlanResults
        plans={[PLAN]}
        mode="surprise"
        canAdjust={false}
        note="Usamos tu ubicación preferida."
        onRegenerate={onRegenerate}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText(/elegimos estas ideas para vos/i)).toBeInTheDocument();
    expect(screen.getByText("Usamos tu ubicación preferida.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ajustar/i }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /sorpréndeme de nuevo/i }),
    );
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("maps the not-enough-activities case to the spec copy", () => {
    render(
      <PlanResults
        plans={[]}
        mode="surprise"
        canAdjust={false}
        onRegenerate={vi.fn()}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/no encontramos suficientes actividades cerca/i),
    ).toBeInTheDocument();
  });
});
