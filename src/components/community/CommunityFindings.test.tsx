import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CommunityPlanRecommendation } from "@/types";
import { CommunityFindings } from "./CommunityFindings";

const plan: CommunityPlanRecommendation = {
  id: 43,
  title: "Una tarde sin apuro",
  description: "Un recorrido para inspirar una salida.",
  estimatedTotalCost: 37000,
  estimatedTotalCostMax: 42000,
  currentPriceMin: 37000,
  currentPriceMax: 42000,
  priceCompleteness: "RANGE",
  estimatedTotalDuration: 360,
  imageUrl: null,
  imageSource: null,
  authorUsername: "viajero1",
  authorAvatarUrl: null,
  peopleCount: 2,
  stops: ["Museo", "Café"],
  experienceCount: 2,
  adaptationCount: 1,
  sharedAverageRating: 4.5,
  sharedExperienceCount: 2,
  latestExperienceAt: "2026-10-01T12:00:00.000Z",
  decisionGrade: true,
  matchReasons: ["covers_experiences", "fits_location"],
  uncertainties: [],
  inspiredBy: null,
};

describe("CommunityFindings", () => {
  it("shows matching public plans without promoting them above the generated proposals", () => {
    render(
      <CommunityFindings
        recommendations={[plan]}
        returnTo="/plan-requests/15"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Planes de la comunidad" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("La mejor para esta búsqueda")).toBeNull();
    expect(screen.getByText("Incluye lo que buscabas")).toBeInTheDocument();
    expect(screen.getByText("4.5 / 5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver plan/ })).toHaveAttribute(
      "href",
      "/plans/43?from=%2Fplan-requests%2F15",
    );
  });

  it("renders no editorial section when ranking has no relevant public plans", () => {
    const { container } = render(<CommunityFindings recommendations={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
