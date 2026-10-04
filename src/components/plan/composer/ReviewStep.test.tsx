import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ActivitySearchResult } from "@/types";

import type { ComposerStop } from "./draft";
import type { ReviewMapStop } from "./ReviewMap";
import { ReviewStep } from "./ReviewStep";
import type { StopInfo } from "./useStopInfo";

// Google Maps can't run in jsdom: the plate's map is a stand-in that shows
// which stops it was handed and lets a marker be pressed.
vi.mock("next/dynamic", () => ({
  default: () =>
    function StubReviewMap(props: {
      stops: ReviewMapStop[];
      onSelectStop: (activityId: number) => void;
    }) {
      return (
        <div data-testid="review-map">
          {props.stops.map((stop) => (
            <button
              key={stop.activityId}
              type="button"
              onClick={() => props.onSelectStop(stop.activityId)}
            >
              Marcador {stop.number}: {stop.name}
            </button>
          ))}
        </div>
      );
    },
}));

function stop(id: number): ComposerStop {
  const activity: ActivitySearchResult = {
    id,
    name: `Actividad ${id}`,
    description: "",
    estimatedCost: 1000,
    estimatedDuration: 30,
    type: null,
    averageRating: 0,
    ratingCount: 0,
    distanceKm: null,
    categories: [],
  };
  return { activity, estimatedCost: 1000, estimatedDuration: 30 };
}

const at = (latitude: number): StopInfo => ({
  coords: { latitude, longitude: -68.8 },
  categories: [],
});

function renderReview(stops: ComposerStop[], stopInfo: Record<number, StopInfo>) {
  const onRevealStop = vi.fn();
  render(
    <ReviewStep
      headingRef={{ current: null }}
      title="Sábado en Mendoza"
      description=""
      peopleCount={2}
      visibility="private"
      stops={stops}
      stopInfo={stopInfo}
      totalDuration={90}
      costPerPerson={1500}
      isSaving={false}
      focusedActivityId={null}
      onPoint={vi.fn()}
      onRevealStop={onRevealStop}
      onEditIdea={vi.fn()}
      onBack={vi.fn()}
      onVisibilityChange={vi.fn()}
    />,
  );
  return { onRevealStop };
}

describe("ReviewStep", () => {
  it("draws the located stops with the route's numbers, and says what is missing", async () => {
    const user = userEvent.setup();
    const { onRevealStop } = renderReview([stop(1), stop(2), stop(3)], {
      1: at(-32.9),
      2: { coords: null, categories: [] },
      3: at(-32.95),
    });

    expect(screen.getByRole("button", { name: "Marcador 1: Actividad 1" })).toBeInTheDocument();
    // The third stop keeps its number in the route, even with the second unplaced.
    expect(screen.getByRole("button", { name: "Marcador 3: Actividad 3" })).toBeInTheDocument();
    expect(screen.getByText(/1 parada no tiene ubicación/)).toBeInTheDocument();
    expect(screen.getByText(/línea recta/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Marcador 3: Actividad 3" }));
    expect(onRevealStop).toHaveBeenCalledWith(3);
  });

  it("closes up without a map when no stop has a place", () => {
    renderReview([stop(1)], { 1: { coords: null, categories: [] } });
    expect(screen.queryByTestId("review-map")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sábado en Mendoza" })).toBeInTheDocument();
  });
});
