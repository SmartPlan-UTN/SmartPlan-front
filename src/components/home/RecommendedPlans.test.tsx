import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanRecommendation, RecommendationsMeta } from "@/types";
import type { RecommendationSlot, UseRecommendationsResult } from "@/hooks";

import { RecommendedPlans } from "./RecommendedPlans";

const useRecommendations = vi.hoisted(() => vi.fn());

vi.mock("@/hooks", async (importActual) => ({
  ...(await importActual<typeof import("@/hooks")>()),
  useRecommendations,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

function plan(id: number, over: Partial<PlanRecommendation["plan"]> = {}) {
  return {
    id,
    title: `Plan ${id}`,
    description: null,
    estimatedTotalCost: 8500,
    estimatedTotalDuration: 240,
    activityCount: 2,
    averageRating: 4.5,
    distanceKm: 3.2,
    imageUrl: null,
    categories: [{ id: 1, name: "Gastronomía" }],
    activityNames: ["Bodega", "Almuerzo"],
    status: { key: "completed" as const, name: "Completed" },
    ...over,
  };
}

const rec = (
  id: number,
  reason: PlanRecommendation["reason"] = "popular",
): PlanRecommendation => ({ reason, canSelect: false, plan: plan(id) });

const cards = (...recs: PlanRecommendation[]): RecommendationSlot[] =>
  recs.map((recommendation) => ({ type: "card", recommendation }));

const meta = (over: Partial<RecommendationsMeta> = {}): RecommendationsMeta => ({
  personalized: true,
  locationUsed: true,
  adjustedFromFeedback: false,
  ...over,
});

function state(over: Partial<UseRecommendationsResult> = {}): UseRecommendationsResult {
  return {
    status: "ready",
    slots: cards(rec(1), rec(2), rec(3)),
    meta: meta(),
    dismiss: vi.fn(),
    undo: vi.fn(),
    retry: vi.fn(),
    ...over,
  };
}

beforeEach(() => {
  useRecommendations.mockReturnValue(state());
});

describe("RecommendedPlans (CU20 · CU21)", () => {
  it("renders the recommendations in the order received, each linking to its plan", () => {
    render(<RecommendedPlans onStartPlan={vi.fn()} />);

    const list = screen.getByRole("list", { name: /planes recomendados/i });
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/plans/1",
      "/plans/2",
      "/plans/3",
    ]);
  });

  it("shows personalized copy when meta says so", () => {
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: /algo de esto te va a gustar/i }),
    ).toBeInTheDocument();
  });

  it("shows the popular framing and a preferences link when not personalized", () => {
    useRecommendations.mockReturnValue(
      state({ meta: meta({ personalized: false, locationUsed: false }) }),
    );
    render(<RecommendedPlans onStartPlan={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /los planes que más gustan/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /elegí tus preferencias/i }),
    ).toHaveAttribute("href", "/preferences");
  });

  it("surfaces the location hint when coordinates were not used", () => {
    useRecommendations.mockReturnValue(
      state({ meta: meta({ locationUsed: false }) }),
    );
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(screen.getByText(/activá la ubicación/i)).toBeInTheDocument();
  });

  it("shows the feedback line only when the ranking was adjusted from feedback", () => {
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(screen.queryByText(/ajustado según tus últimas experiencias/i)).toBeNull();

    useRecommendations.mockReturnValue(
      state({ meta: meta({ adjustedFromFeedback: true }) }),
    );
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(
      screen.getByText(/ajustado según tus últimas experiencias/i),
    ).toBeInTheDocument();
  });

  it("labels each card with its reason", () => {
    useRecommendations.mockReturnValue(
      state({ slots: cards(rec(1, "history"), rec(2, "within_budget")) }),
    );
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(screen.getByText("Va con lo tuyo")).toBeInTheDocument();
    expect(screen.getByText("Dentro de tu presupuesto")).toBeInTheDocument();
  });

  it("dismisses a card through the hook without navigating", async () => {
    const dismiss = vi.fn();
    useRecommendations.mockReturnValue(state({ dismiss }));
    render(<RecommendedPlans onStartPlan={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /no me interesa: plan 2/i }),
    );
    expect(dismiss).toHaveBeenCalledWith(2, "Plan 2");
  });

  it("renders a 'Deshacer' slot and wires undo", async () => {
    const undo = vi.fn();
    useRecommendations.mockReturnValue(
      state({
        slots: [
          { type: "card", recommendation: rec(1) },
          { type: "dismissed", planId: 2, title: "Plan 2", phase: "shown" },
          { type: "card", recommendation: rec(3) },
        ],
        undo,
      }),
    );
    render(<RecommendedPlans onStartPlan={vi.fn()} />);

    expect(screen.getByText(/no lo mostramos más/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /deshacer/i }));
    expect(undo).toHaveBeenCalledWith(2);
  });

  it("fills the rail with a skeleton and a caption while loading", () => {
    useRecommendations.mockReturnValue(
      state({ status: "loading", slots: [], meta: null }),
    );
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(screen.getByText(/buscando planes para vos/i)).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    // Skeleton, not the real (labelled) rail.
    expect(screen.queryByRole("list", { name: /planes recomendados/i })).toBeNull();
  });

  it("keeps the section on error and offers a retry", async () => {
    const retry = vi.fn();
    useRecommendations.mockReturnValue(
      state({ status: "error", slots: [], meta: null, retry }),
    );
    render(<RecommendedPlans onStartPlan={vi.fn()} />);

    expect(
      screen.getByText(/no pudimos cargar tus recomendaciones/i),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("shows a 'caught up' note when signed-in but nothing is left to show", async () => {
    const onStartPlan = vi.fn();
    useRecommendations.mockReturnValue(
      state({ status: "ready", slots: [], meta: meta() }),
    );
    render(<RecommendedPlans onStartPlan={onStartPlan} />);

    expect(screen.getByText(/por ahora, esto es todo/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /armá un plan/i }));
    expect(onStartPlan).toHaveBeenCalledOnce();
  });

  it("renders an onboarding empty state and wires both CTAs", async () => {
    const onStartPlan = vi.fn();
    useRecommendations.mockReturnValue(
      state({ status: "empty", slots: [], meta: null }),
    );
    render(<RecommendedPlans onStartPlan={onStartPlan} />);

    expect(
      screen.getByRole("heading", { name: /todavía estamos conociendo tus gustos/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no hay recomendaciones/i)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /armá un plan/i }));
    expect(onStartPlan).toHaveBeenCalledOnce();

    expect(
      screen.getByRole("link", { name: /elegí tus preferencias/i }),
    ).toHaveAttribute("href", "/preferences");
  });

  it("marks only the rail as busy while loading", () => {
    useRecommendations.mockReturnValue(
      state({ status: "loading", slots: [], meta: null }),
    );
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
  });
});
