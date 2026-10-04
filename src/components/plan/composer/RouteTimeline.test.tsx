import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ActivitySearchResult } from "@/types";

import type { ComposerStop } from "./draft";
import { RouteTimeline } from "./RouteTimeline";

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

describe("RouteTimeline linking", () => {
  it("reports the stop pointed at and marks the one pointed at elsewhere", () => {
    const onPoint = vi.fn();
    const { rerender } = render(
      <RouteTimeline stops={[stop(1), stop(2)]} onPoint={onPoint} />,
    );
    const rows = screen.getAllByRole("listitem");

    fireEvent.pointerEnter(rows[1]);
    expect(onPoint).toHaveBeenLastCalledWith(2);
    fireEvent.pointerLeave(rows[1]);
    expect(onPoint).toHaveBeenLastCalledWith(null);

    rerender(
      <RouteTimeline
        stops={[stop(1), stop(2)]}
        onPoint={onPoint}
        linkedActivityId={1}
      />,
    );
    const [first, second] = screen.getAllByRole("listitem");
    expect(first.className).toMatch(/linked/);
    expect(second.className).not.toMatch(/linked/);
  });
});
