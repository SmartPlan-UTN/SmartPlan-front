import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PlanRequestPlanSummary, PlanSelectionResult } from "@/types";

import { PlanResults } from "./PlanResults";

const selectPlan = vi.hoisted(() => vi.fn());
const deselectPlan = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  selectPlan,
  deselectPlan,
}));

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
  viewerPlanState: "selectable",
};

/**
 * CU17 requires a generated plan to be actionable, adjustable or discardable.
 */
describe("PlanResults (CU17)", () => {
  it("links each alternative to its detail view", () => {
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    const link = screen.getByRole("link", {
      name: /tarde de vinos sin manejar/i,
    });
    expect(link).toHaveAttribute("href", "/plans/7");
    expect(
      screen.getByRole("button", { name: /^lo voy a hacer$/i }),
    ).toBeInTheDocument();
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

/**
 * CU22 — marking (and un-marking) the intent to do a plan. Reversible, no
 * modal: "Lo voy a hacer" fires the PATCH directly; "Ya no lo voy a hacer"
 * fires the DELETE. `selected` shows only after the backend confirms.
 */
describe("PlanResults (CU22 — plan intent)", () => {
  const selectedResult: PlanSelectionResult = {
    id: 7,
    planRequestId: 3,
    status: { key: "selected", name: "Elegido" },
    viewerPlanState: "selected",
  };
  const generatedResult: PlanSelectionResult = {
    id: 7,
    planRequestId: 3,
    status: { key: "generated", name: "Generado" },
    viewerPlanState: "selectable",
  };

  const twoPlans: PlanRequestPlanSummary[] = [
    PLAN,
    { ...PLAN, id: 8, title: "Otra tarde" },
  ];

  /** Mirrors what LandingHero does: applies the backend result in place. */
  function Harness({
    initial,
    onReconcile,
  }: {
    initial: PlanRequestPlanSummary[];
    onReconcile?: () => void;
  }) {
    const [plans, setPlans] = useState(initial);
    return (
      <PlanResults
        plans={plans}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
        onPlanSelected={(result) =>
          setPlans((current) =>
            current.map((plan) => {
              if (plan.id === result.id)
                return {
                  ...plan,
                  status: result.status,
                  viewerPlanState: result.viewerPlanState,
                };
              return plan;
            }),
          )
        }
        onSelectionReconcile={onReconcile ?? vi.fn()}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    selectPlan.mockResolvedValue(selectedResult);
    deselectPlan.mockResolvedValue(generatedResult);
  });

  it("marks a plan with one direct PATCH — no modal — and shows the resolved state", async () => {
    const user = userEvent.setup();
    render(<Harness initial={twoPlans} />);

    await user.click(
      screen.getAllByRole("button", { name: /^lo voy a hacer$/i })[0],
    );

    await waitFor(() =>
      expect(screen.getByText("Lo vas a hacer")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(selectPlan).toHaveBeenCalledOnce();
    expect(selectPlan).toHaveBeenCalledWith(7);
    expect(
      screen.getByText(/marcamos .* como uno que vas a hacer/i),
    ).toBeInTheDocument();
    // The other alternative is untouched — still its own "Lo voy a hacer".
    expect(
      screen.getAllByRole("button", { name: /^lo voy a hacer$/i }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: /ya no lo voy a hacer/i }),
    ).toBeInTheDocument();
  });

  it("un-marks a plan with a direct DELETE", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={[{ ...PLAN, viewerPlanState: "selected" }]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /ya no lo voy a hacer/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^lo voy a hacer$/i }),
      ).toBeInTheDocument(),
    );
    expect(deselectPlan).toHaveBeenCalledOnce();
    expect(deselectPlan).toHaveBeenCalledWith(7);
  });

  it("does not double-submit on a double click", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[PLAN]} />);

    const button = screen.getByRole("button", { name: /^lo voy a hacer$/i });
    await user.dblClick(button);

    await waitFor(() => expect(selectPlan).toHaveBeenCalled());
    expect(selectPlan).toHaveBeenCalledTimes(1);
  });

  it("reconciles from the server on a 409 and reports it", async () => {
    selectPlan.mockRejectedValue(
      new ApiError({
        message: "x",
        type: "HTTP",
        status: 409,
        code: "PLAN_REQUEST_ALREADY_ADVANCED",
      }),
    );
    const onReconcile = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={[PLAN]} onReconcile={onReconcile} />);

    await user.click(screen.getByRole("button", { name: /^lo voy a hacer$/i }));

    await waitFor(() => expect(onReconcile).toHaveBeenCalledOnce());
    expect(screen.getByText(/cambió de estado/i)).toBeInTheDocument();
  });

  it("reports a network error without changing the card", async () => {
    selectPlan.mockRejectedValue(
      new ApiError({ message: "sin red", type: "NETWORK" }),
    );
    const user = userEvent.setup();
    render(<Harness initial={[PLAN]} />);

    await user.click(screen.getByRole("button", { name: /^lo voy a hacer$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/no pudimos guardar el cambio/i),
      ).toBeInTheDocument(),
    );
    // Still offering to mark it — nothing was applied.
    expect(
      screen.getByRole("button", { name: /^lo voy a hacer$/i }),
    ).toBeInTheDocument();
  });

  it("shows the resolved state for an alternative that is already marked", () => {
    render(
      <PlanResults
        plans={[{ ...PLAN, viewerPlanState: "selected" }]}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText("Lo vas a hacer")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^lo voy a hacer$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ya no lo voy a hacer/i }),
    ).toBeInTheDocument();
  });
});
