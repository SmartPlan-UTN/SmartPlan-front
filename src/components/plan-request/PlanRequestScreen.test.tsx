import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanRequestScreen } from "./PlanRequestScreen";

const submit = vi.hoisted(() => vi.fn());
const mockPlanning = vi.hoisted(() => ({
  phase: "generated",
  planRequestId: 15,
  query: "paseo gratis",
  resolvedContext: { budget: 0, partySize: 1 },
  plans: [{ id: 14, title: "Plan de SmartPlan" }],
  understanding: null,
  lastSubmission: null,
  submit,
  communityRecommendations:
    [] as import("@/types").CommunityPlanRecommendation[],
  primaryRecommendation: null as
    | import("@/types").ResultRecommendationSource
    | null,
  regenerate: vi.fn(),
  applySelectionChange: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks", () => ({ usePlanRequestPolling: () => mockPlanning }));
vi.mock("@/components/home/PlanResults", () => ({
  PlanResults: ({
    returnTo,
    communityRecommendations,
  }: {
    returnTo: string;
    communityRecommendations: unknown[];
  }) => (
    <>
      <a href={returnTo}>Results origin</a>
      <p>Community matches: {communityRecommendations?.length ?? 0}</p>
    </>
  ),
}));
vi.mock("@/components/home/GenerationState", () => ({
  GenerationState: () => null,
}));

describe("New plan search", () => {
  it("does not silently impose the previous inferred budget or party size", () => {
    render(<PlanRequestScreen requestId={15} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Tu idea" }), {
      target: { value: "Tengo 30000 pesos para dos personas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar de nuevo" }));
    expect(submit).toHaveBeenCalledWith({
      query: "Tengo 30000 pesos para dos personas",
    });
  });
});

it("reopens the existing request without submitting a new search", () => {
  submit.mockClear();
  render(<PlanRequestScreen requestId={15} />);
  expect(screen.getByRole("link", { name: "Results origin" })).toHaveAttribute(
    "href",
    "/plan-requests/15",
  );
  expect(submit).not.toHaveBeenCalled();
});

it("passes community matches to the results footer without promoting them above generated plans", () => {
  mockPlanning.primaryRecommendation = { source: "community", planId: 43 };
  mockPlanning.communityRecommendations = [
    {
      id: 43,
      title: "Una tarde sin apuro",
      description: null,
      estimatedTotalCost: 12000,
      estimatedTotalCostMax: 12000,
      currentPriceMin: 12000,
      currentPriceMax: 12000,
      estimatedTotalDuration: 120,
      imageUrl: null,
      imageSource: null,
      authorUsername: "lucia",
      authorAvatarUrl: null,
      peopleCount: 2,
      stops: ["Museo"],
      experienceCount: 0,
      adaptationCount: 0,
      priceCompleteness: "EXACT",
      sharedAverageRating: null,
      sharedExperienceCount: 0,
      latestExperienceAt: null,
      decisionGrade: true,
      matchReasons: ["fits_budget"],
      uncertainties: [],
      inspiredBy: null,
    },
  ];
  render(<PlanRequestScreen requestId={15} />);
  expect(screen.getByText("Community matches: 1")).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Otras propuestas de SmartPlan" }),
  ).toBeNull();
  mockPlanning.primaryRecommendation = null;
  mockPlanning.communityRecommendations = [];
});
