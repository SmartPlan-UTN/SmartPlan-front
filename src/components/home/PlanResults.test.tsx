import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { outingCreation } from "@/test/fixtures/outings";
import type { PlanDetailResult, PlanItineraryActivity } from "@/types";

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

function location(overrides: Partial<PlanItineraryActivity["locations"][number]> = {}) {
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
  estimatedTotalCostMax: 30000,
  priceCompleteness: "RANGE",
  peopleCount: 2,
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

  it("offers starting again", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={onDiscard} />);

    await user.click(screen.getByRole("button", { name: /empezar de nuevo/i }));

    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("still offers a way forward when the backend returned no plans", async () => {
    const user = userEvent.setup();
    const onAdjust = vi.fn();
    render(<PlanResults plans={[]} onAdjust={onAdjust} onDiscard={vi.fn()} />);

    expect(screen.getByText("No hay planes disponibles para esa consulta")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ajustar la idea/i }));
    expect(onAdjust).toHaveBeenCalledOnce();
  });

  it("leads with one recommendation and a way to see its route on the map", () => {
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    expect(screen.getByTestId("hero-recommendation")).toBeInTheDocument();
    expect(screen.getByText("2 actividades · 5h estimadas")).toBeInTheDocument();
    expect(screen.getByText("Dónde queda")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver recorrido/i })).toBeInTheDocument();
  });

  it("shows the group total and the matching per-person range", () => {
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    expect(screen.getByText("$ 24.000 – $ 30.000", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("$ 12.000 – $ 15.000 por persona · 2 personas")).toBeInTheDocument();
  });

  it("shows the zone derived from the plan's first located stop", () => {
    render(<PlanResults plans={[PLAN]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    expect(screen.getByText("Luján de Cuyo")).toBeInTheDocument();
  });

  it("names a single-stop plan by the experience and shows its venue separately", () => {
    const firstStop = PLAN.details[0];
    if (!firstStop?.activity) throw new Error("The fixture needs an activity");
    const singleStop: PlanDetailResult = {
      ...PLAN,
      details: [
        {
          ...firstStop,
          activity: {
            ...firstStop.activity,
            name: "Almorzar entre viñedos",
          },
        },
      ],
    };

    render(<PlanResults plans={[singleStop]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    expect(
      within(screen.getByTestId("hero-recommendation")).getByRole("heading", {
        level: 2,
        name: "Almorzar entre viñedos",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bodega Central")).toBeInTheDocument();
  });

  it("explains when generated alternatives omit an unavailable experience", () => {
    render(
      <PlanResults
        plans={[PLAN]}
        unsupportedExperiences={["Cine"]}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/no encontramos opciones verificables para cine/i),
    ).toHaveAttribute("role", "status");
    expect(screen.getByText(/no incluyen esa experiencia/i)).toBeInTheDocument();
  });

  it("shows what was understood, with the person's own words and without defaults", () => {
    render(
      <PlanResults
        plans={[PLAN]}
        understanding={{
          chips: [
            { key: "experiences", label: "Tomar algo", source: "text", icon: "🍸" },
            { key: "facet", label: "Fachero", source: "text", icon: "✨" },
          ],
          missing: ["when", "budget", "party"],
          values: {
            occasion: null, partySize: 1, date: "2026-10-17", startMinutes: null, now: false,
            budget: null, budgetStrict: false, travelTolerance: "medium", experiences: ["drinks"],
            vibe: [], pricePreference: null, indoorOnly: false, freeOnly: false,
          },
        }}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText("Fachero")).toBeInTheDocument();
    expect(screen.getByText("Tomar algo")).toBeInTheDocument();
    expect(screen.queryByText(/1 persona/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/mañana/i)).not.toBeInTheDocument();
  });

  it("lets the person move the map between the options", async () => {
    const user = userEvent.setup();
    const secondPlan = { ...PLAN, id: 8, title: "Paseo por el parque" };
    render(<PlanResults plans={[PLAN, secondPlan]} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    const tabs = within(screen.getByRole("group", { name: /ver en el mapa/i })).getAllByRole("button");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-pressed", "true");
    await user.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 2, name: secondPlan.title })).toBeInTheDocument();
  });

  it("shows at most three options", () => {
    const many = Array.from({ length: 5 }, (_, index) => ({
      ...PLAN,
      id: index + 1,
      title: `Opción ${index + 1}`,
    }));
    render(<PlanResults plans={many} onAdjust={vi.fn()} onDiscard={vi.fn()} />);

    expect(screen.getAllByRole("article")).toHaveLength(3);
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

    expect(screen.getByText(/te sorprendo con este/i)).toBeInTheDocument();
    expect(screen.getByText("Usamos tu ubicación preferida.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ajustar/i }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /sorpréndeme de nuevo/i }),
    );
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it.each(["auto", "surprise"] as const)("shows an empty result for %s queries (CU17/CU19)", (mode) => {
    render(
      <PlanResults
        plans={[]}
        mode={mode}
        canAdjust={false}
        onRegenerate={vi.fn()}
        onAdjust={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No hay planes disponibles para esa consulta"),
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


it("carries the request origin in hero and alternative detail links", () => {
  render(<PlanResults plans={[PLAN, { ...PLAN, id: 8, title: 'Otra salida' }]} returnTo="/plan-requests/42" onAdjust={vi.fn()} onDiscard={vi.fn()} />);
  expect(screen.getByRole("link", { name: PLAN.title })).toHaveAttribute("href", "/plans/7?from=%2Fplan-requests%2F42");
  expect(screen.getByRole("link", { name: 'Otra salida' })).toHaveAttribute("href", "/plans/8?from=%2Fplan-requests%2F42");
});
