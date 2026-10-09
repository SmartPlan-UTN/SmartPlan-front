import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { outingCreation } from "@/test/fixtures/outings";
import type { PlanDetailResult } from "@/types";

import { PlanResults } from "./PlanResults";

const createOuting = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  createOuting,
}));

// The real map loads the Google Maps JS API from a CDN script — not
// available (and not the point) in a jsdom unit test. PlanResults' own
// tests are about the header/cards/CU22 wiring; ResultsMap gets its own
// coverage (buildPlanPins.test.ts) for the data it's actually built from.
vi.mock("./ResultsMap", () => ({
  ResultsMap: () => <div data-testid="results-map-stub" />,
}));

function location(overrides: Partial<PlanDetailResult["details"][number]["activity"]["locations"][number]> = {}) {
  return {
    id: 1,
    latitude: -32.9,
    longitude: -68.8,
    notes: null,
    place: {
      id: 1,
      name: "Bodega Central",
      description: null,
      address: "Calle 1",
      department: {
        id: 1,
        name: "Luján de Cuyo",
        city: { id: 1, name: "Mendoza", country: { id: 1, name: "Argentina" } },
      },
    },
    ...overrides,
  };
}

const PLAN: PlanDetailResult = {
  id: 7,
  title: "Tarde de vinos sin manejar",
  description: "Recorrido por bodegas con almuerzo incluido.",
  estimatedTotalDuration: 300,
  estimatedTotalCost: 24000,
  activityCount: 2,
  averageRating: 4.5,
  distanceKm: 12.4,
  categories: [{ id: 1, name: "Vinos" }],
  activityNames: ["Degustación guiada", "Almuerzo entre viñedos"],
  status: { key: "generated", name: "Generated" },
  viewerPlanState: "selectable",
  activeOutingId: null,
  kind: "generated",
  visibility: "private",
  ownedByViewer: true,
  details: [
    {
      id: 1,
      order: 1,
      estimatedCost: 15000,
      estimatedDuration: 150,
      activity: {
        id: 101,
        name: "Degustación guiada",
        description: "desc",
        estimatedCost: 15000,
        estimatedDuration: 150,
        type: null,
        averageRating: 4.5,
        ratingCount: 10,
        categories: [{ id: 1, name: "Vinos" }],
        locations: [location()],
      },
    },
    {
      id: 2,
      order: 2,
      estimatedCost: 9000,
      estimatedDuration: 150,
      activity: {
        id: 102,
        name: "Almuerzo entre viñedos",
        description: "desc",
        estimatedCost: 9000,
        estimatedDuration: 150,
        type: null,
        averageRating: 0,
        ratingCount: 0,
        categories: [],
        locations: [],
      },
    },
  ],
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

  it("shows each option's description and a way to see its route on the map", () => {
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    expect(
      screen.getByText("Recorrido por bodegas con almuerzo incluido."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ver recorrido/i }),
    ).toBeInTheDocument();
  });

  it("shows the zone derived from the plan's first located stop", () => {
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    expect(screen.getByText("Luján de Cuyo")).toBeInTheDocument();
  });

  it("shows what was searched and what the system understood from it", () => {
    render(
      <PlanResults
        plans={[PLAN]}
        query="algo romántico para el finde"
        resolvedContext={{
          budget: 20000,
          partySize: 2,
          departmentName: "Luján de Cuyo",
          categories: [{ id: 1, name: "Vinos" }],
        }}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText(/algo romántico para el finde/)).toBeInTheDocument();
    expect(screen.getByText(/2 personas/i)).toBeInTheDocument();
    expect(screen.getAllByText("Luján de Cuyo").length).toBeGreaterThan(0);
  });

  it("synchronizes the mobile map's plan sheet with its accessible controls", async () => {
    const user = userEvent.setup();
    const secondPlan = { ...PLAN, id: 8, title: "Paseo por el parque" };
    render(<PlanResults plans={[PLAN, secondPlan]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: /mapa/i }));
    const sheet = screen.getByRole("region", { name: /plan seleccionado en el mapa/i });
    expect(sheet).toHaveTextContent(PLAN.title);

    await user.click(screen.getByRole("button", { name: /plan siguiente/i }));
    expect(sheet).toHaveTextContent(secondPlan.title);
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
 * CU22, #130 — "Lo voy a hacer" adds the result to Mis salidas once. No
 * modal, no undo on the card: the button is disabled while it saves, then
 * the card reads "Agregado a Mis salidas" with a link to the outing.
 */
describe("PlanResults (CU22 — Lo voy a hacer)", () => {
  const twoPlans: PlanDetailResult[] = [
    PLAN,
    { ...PLAN, id: 8, title: "Otra tarde" },
  ];

  /** Mirrors what LandingHero does: applies the outing in place. */
  function Harness({
    initial,
    onReconcile,
  }: {
    initial: PlanDetailResult[];
    onReconcile?: () => void;
  }) {
    const [plans, setPlans] = useState(initial);
    return (
      <PlanResults
        plans={plans}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
        onPlanSelected={(planId, outingId) =>
          setPlans((current) =>
            current.map((plan) =>
              plan.id === planId
                ? { ...plan, viewerPlanState: "selected", activeOutingId: outingId }
                : plan,
            ),
          )
        }
        onSelectionReconcile={onReconcile ?? vi.fn()}
      />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    createOuting.mockResolvedValue(outingCreation({ id: 40 }));
  });

  it("adds the plan to Mis salidas with one direct call — no modal", async () => {
    const user = userEvent.setup();
    render(<Harness initial={twoPlans} />);

    await user.click(
      screen.getAllByRole("button", { name: /^lo voy a hacer$/i })[0],
    );

    await waitFor(() =>
      expect(screen.getByText("Agregado a Mis salidas")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createOuting).toHaveBeenCalledOnce();
    expect(createOuting).toHaveBeenCalledWith(7);
    expect(
      screen.getByRole("link", { name: /ver en mis salidas/i }),
    ).toHaveAttribute("href", "/outings/40");
    expect(screen.getByText(/agregamos .* a mis salidas/i)).toBeInTheDocument();
    // The other alternative is untouched — still its own "Lo voy a hacer".
    expect(
      screen.getAllByRole("button", { name: /^lo voy a hacer$/i }),
    ).toHaveLength(1);
    // No way back from the card: that is Mis salidas' job.
    expect(
      screen.queryByRole("button", { name: /ya no lo voy a hacer/i }),
    ).not.toBeInTheDocument();
  });

  it("disables the button while saving and never double-submits", async () => {
    let release!: () => void;
    createOuting.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(outingCreation({ id: 40 }));
      }),
    );
    const user = userEvent.setup();
    render(<Harness initial={[PLAN]} />);

    const button = screen.getByRole("button", { name: /^lo voy a hacer$/i });
    await user.dblClick(button);

    expect(button).toBeDisabled();
    expect(createOuting).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() =>
      expect(screen.getByText("Agregado a Mis salidas")).toBeInTheDocument(),
    );
  });

  it("reconciles from the server on a 409 and reports it", async () => {
    createOuting.mockRejectedValue(
      new ApiError({
        message: "x",
        type: "HTTP",
        status: 409,
        code: "PLAN_NOT_ACTIONABLE",
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
    createOuting.mockRejectedValue(
      new ApiError({ message: "sin red", type: "NETWORK" }),
    );
    const user = userEvent.setup();
    render(<Harness initial={[PLAN]} />);

    await user.click(screen.getByRole("button", { name: /^lo voy a hacer$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/no pudimos agregarlo a mis salidas/i),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /^lo voy a hacer$/i }),
    ).toBeEnabled();
  });

  it("shows an alternative already chosen as added, linking to its outing", () => {
    render(
      <PlanResults
        plans={[{ ...PLAN, viewerPlanState: "selected", activeOutingId: 55 }]}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText("Agregado a Mis salidas")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver en mis salidas/i }),
    ).toHaveAttribute("href", "/outings/55");
    expect(
      screen.queryByRole("button", { name: /^lo voy a hacer$/i }),
    ).not.toBeInTheDocument();
  });
});
