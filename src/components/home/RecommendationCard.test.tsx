import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlanRecommendation } from "@/types";

import { RecommendationCard } from "./RecommendationCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

function make(over: Partial<PlanRecommendation["plan"]> = {}): PlanRecommendation {
  return {
    reason: "history",
    canSelect: false,
    plan: {
      id: 7,
      title: "Tarde de vinos",
      description: "Una copa con vista",
      estimatedTotalCost: 8500,
      estimatedTotalDuration: 240,
      activityCount: 2,
      averageRating: 4.6,
      distanceKm: 12.4,
      imageUrl: null,
      categories: [{ id: 1, name: "Bodegas" }],
      activityNames: ["Bodega", "Almuerzo"],
      status: { key: "completed", name: "Completed" },
      ...over,
    },
  };
}

describe("RecommendationCard (CU20)", () => {
  it("links to the plan detail and shows the discovery essentials", () => {
    render(<RecommendationCard recommendation={make()} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/plans/7");
    expect(screen.getByRole("heading", { name: "Tarde de vinos" })).toBeInTheDocument();
    expect(screen.getByText("Va con lo tuyo")).toBeInTheDocument();
    expect(screen.getByText("Bodegas")).toBeInTheDocument();
    expect(screen.getByText("12.4 km")).toBeInTheDocument();
  });

  it("uses the activity sequence as the fallback graphic when there is no image", () => {
    const { container } = render(
      <RecommendationCard recommendation={make({ imageUrl: null })} />,
    );
    expect(screen.getByText("Bodega → Almuerzo")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders a real image when the plan has one", () => {
    const { container } = render(
      <RecommendationCard
        recommendation={make({ imageUrl: "https://example.test/p.jpg" })}
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain("p.jpg");
    expect(screen.queryByText("Bodega → Almuerzo")).toBeNull();
  });

  it("omits the rating when there are no ratings yet", () => {
    render(<RecommendationCard recommendation={make({ averageRating: 0 })} />);
    expect(screen.queryByText("0.0")).toBeNull();
  });
});
