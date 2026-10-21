import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { downloadMedia } from "@/lib/api/media";

import type { PlanRecommendation } from "@/types";

import { RecommendationCard } from "./RecommendationCard";

vi.mock("@/lib/api/media", () => ({ downloadMedia: vi.fn() }));

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

    expect(screen.getByRole("link")).toHaveAttribute("href", "/plans/7?from=%2F");
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

  describe("with an image", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: vi.fn(() => "blob:plan-photo"),
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: vi.fn(),
      });
    });

    it("renders the place's Google photo, credited to Google Maps (SmartPlan-back#102)", async () => {
      vi.mocked(downloadMedia).mockResolvedValue({
        blob: new Blob(["photo"]),
        attribution: { provider: "google_maps", authors: [] },
      });
      const { container } = render(
        <RecommendationCard
          recommendation={make({
            imageUrl: "/api/activity-places/3/photo",
            imageSource: "google_maps",
          })}
        />,
      );

      expect(await screen.findByText("Google Maps")).toBeInTheDocument();
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "blob:plan-photo",
      );
      expect(downloadMedia).toHaveBeenCalledWith("/api/activity-places/3/photo");
      expect(screen.queryByText("Bodega → Almuerzo")).toBeNull();
    });

    it("keeps the editorial graphic when the photo cannot be loaded", async () => {
      vi.mocked(downloadMedia).mockRejectedValue(new Error("401"));
      render(
        <RecommendationCard
          recommendation={make({ imageUrl: "/api/activity-places/3/photo" })}
        />,
      );

      expect(await screen.findByText("Bodega → Almuerzo")).toBeInTheDocument();
    });
  });

  it("omits the rating when there are no ratings yet", () => {
    render(<RecommendationCard recommendation={make({ averageRating: 0 })} />);
    expect(screen.queryByText("0.0")).toBeNull();
  });

  it("shows no dismiss button unless a handler is given", () => {
    render(<RecommendationCard recommendation={make()} />);
    expect(screen.queryByRole("button", { name: /no me interesa/i })).toBeNull();
  });

  it("calls onDismiss with the plan id and title, and does not navigate", async () => {
    const onDismiss = vi.fn();
    render(<RecommendationCard recommendation={make()} onDismiss={onDismiss} />);

    const button = screen.getByRole("button", {
      name: /no me interesa: tarde de vinos/i,
    });
    await userEvent.click(button);

    expect(onDismiss).toHaveBeenCalledWith(7, "Tarde de vinos");
    // The click never bubbled to the card's link.
    expect(screen.getByRole("link")).toHaveAttribute("href", "/plans/7?from=%2F");
  });

  it("surfaces the CU21 reason chips", () => {
    render(
      <RecommendationCard
        recommendation={{ ...make(), reason: "well_rated_by_you" }}
      />,
    );
    expect(screen.getByText("Como lo que disfrutaste")).toBeInTheDocument();
  });
});
