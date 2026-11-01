import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkPlanComposer } from "@/lib/api";
import type { ComposerCheckResult } from "@/types";

import type { AdaptSource } from "./AdaptBanner";
import { AdaptStep, DEFAULT_ADAPT_CONTEXT, type AdaptStepProps } from "./AdaptStep";
import type { ComposerStop } from "./draft";

vi.mock("@/lib/api", () => ({ checkPlanComposer: vi.fn() }));

const source: AdaptSource = {
  id: 43,
  title: "Una tarde sin apuro",
  authorUsername: "ana",
  authorAvatarUrl: null,
  peopleCount: 2,
  stopKeys: ["a1", "a2"],
  totalCost: 37000,
  totalLabel: "$ 37.000",
  duration: 465,
};

function stop(id: number, name: string): ComposerStop {
  return {
    activity: { id, name, estimatedDuration: 60 } as ComposerStop["activity"],
    estimatedCost: 0,
    estimatedDuration: 60,
  };
}

function checked(hours: Array<ComposerCheckResult["stops"][number]["hours"]>, budget?: ComposerCheckResult["budget"]): ComposerCheckResult {
  return {
    stops: hours.map((value, index) => ({
      index,
      name: `Parada ${index + 1}`,
      startTime: "19:00",
      endTime: "20:00",
      travelMinutesFromPrevious: index === 0 ? null : 10,
      hours: value,
      closesAt: value === "CLOSES_DURING" ? "19:30" : null,
    })),
    totals: { min: 0, max: 0, unpriced: 0, completeness: "EXACT" },
    budget: budget ?? { status: "NO_BUDGET", remaining: null },
    issues: [],
    continuations: [],
  };
}

function setup(overrides: Partial<AdaptStepProps> = {}) {
  const props: AdaptStepProps = {
    source,
    title: "Mi versión",
    titleError: null,
    peopleCount: 2,
    peopleError: null,
    stops: [stop(1, "Museo"), stop(2, "Plaza")],
    totalLabel: "$ 37.000",
    totalCost: 37000,
    perPersonLabel: "$ 18.500",
    duration: 120,
    context: { ...DEFAULT_ADAPT_CONTEXT, date: "2026-11-07" },
    isSaving: false,
    onTitleChange: vi.fn(),
    onPeopleCountChange: vi.fn(),
    onContextChange: vi.fn(),
    onRemoveStop: vi.fn(),
    onSwapStop: vi.fn(),
    onFindCheaper: vi.fn(),
    onContinue: vi.fn(),
    onReview: vi.fn(),
    ...overrides,
  };
  render(<AdaptStep {...props} />);
  return props;
}

describe("AdaptStep", () => {
  beforeEach(() => vi.mocked(checkPlanComposer).mockReset());

  it("asks for a day before it says anything about the route", () => {
    setup({ context: DEFAULT_ADAPT_CONTEXT });

    expect(screen.getByText("Elegí un día para comprobar los horarios.")).toBeInTheDocument();
    expect(checkPlanComposer).not.toHaveBeenCalled();
  });

  it("never says the route works when no hour could be confirmed", async () => {
    vi.mocked(checkPlanComposer).mockResolvedValue(checked(["UNKNOWN", "UNKNOWN"]));
    setup();

    expect(await screen.findByText(/No tenemos horarios confirmados/)).toBeInTheDocument();
    expect(screen.queryByText(/Todo el recorrido te sirve/)).toBeNull();
    // Said once for the route, not repeated on every stop.
    expect(screen.queryAllByText("Horario sin confirmar")).toHaveLength(0);
  });

  it("says the route works only when every hour is confirmed open", async () => {
    vi.mocked(checkPlanComposer).mockResolvedValue(checked(["CONFIRMED_OPEN", "CONFIRMED_OPEN"]));
    setup();

    expect(await screen.findByText("Todo el recorrido te sirve ese día.")).toBeInTheDocument();
    expect(screen.getAllByText(/Abierto cuando llegás/)).toHaveLength(2);
  });

  it("offers a swap only for the stop that needs one, and lets it go to the catalog", async () => {
    vi.mocked(checkPlanComposer).mockResolvedValue(checked(["CONFIRMED_OPEN", "CLOSED"]));
    const user = userEvent.setup();
    const props = setup();

    expect(await screen.findByText("Una parada necesita un cambio.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Cambiar por otra" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Cambiar por otra" }));
    expect(props.onSwapStop).toHaveBeenCalledWith(2);
  });

  it("says plainly when the group passes its budget, with the way to cheaper options", async () => {
    vi.mocked(checkPlanComposer).mockResolvedValue(checked(["CONFIRMED_OPEN", "CONFIRMED_OPEN"], { status: "EXCEEDS", remaining: null }));
    const user = userEvent.setup();
    const props = setup({ context: { ...DEFAULT_ADAPT_CONTEXT, date: "2026-11-07", budget: "15000" } });

    expect(await screen.findByText(/el recorrido cuesta \$ 37\.000, y tu presupuesto es de \$15\.000/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver opciones más baratas" }));
    expect(props.onFindCheaper).toHaveBeenCalled();
  });

  it("compares what changed against the original", async () => {
    vi.mocked(checkPlanComposer).mockResolvedValue(checked(["UNKNOWN", "UNKNOWN"]));
    setup({ peopleCount: 3, totalLabel: "$ 55.500", totalCost: 55500 });

    const comparison = screen.getByRole("region", { name: "Tu versión frente al original" });
    expect(comparison).toHaveTextContent("Original");
    expect(comparison).toHaveTextContent("$ 37.000");
    expect(comparison).toHaveTextContent("$ 55.500");
    expect(comparison).toHaveTextContent("+$18.500");
    await waitFor(() => expect(checkPlanComposer).toHaveBeenCalled());
  });

  it("keeps the original untouched by never removing the last stop", () => {
    setup({ stops: [stop(1, "Museo")], context: DEFAULT_ADAPT_CONTEXT });

    expect(screen.getByRole("button", { name: "Quitar Museo" })).toBeDisabled();
  });
});
