import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanRecommendation, RecommendationsMeta } from "@/types";
import type { UseRecommendationsResult } from "@/hooks";

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

function state(over: Partial<UseRecommendationsResult> = {}): UseRecommendationsResult {
  return {
    status: "ready",
    items: [rec(1), rec(2), rec(3)],
    meta: { personalized: true, locationUsed: true } as RecommendationsMeta,
    ...over,
  };
}

beforeEach(() => {
  useRecommendations.mockReturnValue(state());
});

describe("RecommendedPlans (CU20)", () => {
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
      state({ meta: { personalized: false, locationUsed: false } }),
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
      state({ meta: { personalized: true, locationUsed: false } }),
    );
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(screen.getByText(/activá la ubicación/i)).toBeInTheDocument();
  });

  it("labels each card with its reason", () => {
    useRecommendations.mockReturnValue({
      ...state(),
      items: [rec(1, "history"), rec(2, "near_you")],
    });
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(screen.getByText("Va con lo tuyo")).toBeInTheDocument();
    expect(screen.getByText("Cerca tuyo")).toBeInTheDocument();
  });

  it("renders a discreet loading state, not a skeleton", () => {
    useRecommendations.mockReturnValue(state({ status: "loading", items: [], meta: null }));
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(screen.getByText(/buscando planes para vos/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /planes recomendados/i })).toBeNull();
  });

  it("hides the whole section on error", () => {
    useRecommendations.mockReturnValue(state({ status: "error", items: [], meta: null }));
    const { container } = render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an onboarding empty state and wires both CTAs", async () => {
    const onStartPlan = vi.fn();
    useRecommendations.mockReturnValue(state({ status: "empty", items: [], meta: null }));
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
    useRecommendations.mockReturnValue(state({ status: "loading", items: [], meta: null }));
    render(<RecommendedPlans onStartPlan={vi.fn()} />);
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
  });
});
