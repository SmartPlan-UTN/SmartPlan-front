import { describe, expect, it } from "vitest";

import type { ActivitySearchResult } from "@/types";

import type { ComposerStop } from "./draft";
import { getRouteInsights, MAX_INSIGHTS } from "./routeInsights";

function stop(
  id: number,
  categories: string[],
  estimatedDuration = 60,
  coords?: { latitude: number; longitude: number },
): ComposerStop {
  const activity: ActivitySearchResult = {
    id,
    name: `Actividad ${id}`,
    description: "",
    estimatedCost: 1000,
    estimatedDuration,
    type: "Experiencia",
    averageRating: 0,
    ratingCount: 0,
    distanceKm: null,
    categories: categories.map((name, index) => ({ id: index + 1, name })),
  };
  return { activity, estimatedCost: 1000, estimatedDuration, coords };
}

describe("getRouteInsights", () => {
  it("says nothing for an empty or varied route", () => {
    expect(getRouteInsights([])).toEqual([]);
    expect(
      getRouteInsights([stop(1, ["Bodega"]), stop(2, ["Museo"])]),
    ).toEqual([]);
  });

  it("points out a repeated category", () => {
    const insights = getRouteInsights([
      stop(1, ["Gastronomía"]),
      stop(2, ["Museo"]),
      stop(3, ["Gastronomía"]),
    ]);
    expect(insights).toHaveLength(1);
    expect(insights[0].text).toBe("2 de tus paradas son de Gastronomía.");
  });

  it("ignores stops without category data", () => {
    expect(getRouteInsights([stop(1, []), stop(2, [])])).toEqual([]);
  });

  it("leaves how long the route is to the duration health, not to insights", () => {
    expect(
      getRouteInsights([stop(1, ["A"], 900), stop(2, ["B"], 900)]),
    ).toEqual([]);
  });

  it("offers a nearer order only with known positions and a real saving", () => {
    const a = { latitude: -32.9, longitude: -68.8 };
    const far = { latitude: -33.9, longitude: -68.8 };
    const near = { latitude: -32.95, longitude: -68.8 };
    const noCoords = getRouteInsights([
      stop(1, ["A"]),
      stop(2, ["B"]),
      stop(3, ["C"]),
    ]);
    expect(noCoords).toEqual([]);

    const insights = getRouteInsights([
      stop(1, ["A"], 60, a),
      stop(2, ["B"], 60, far),
      stop(3, ["C"], 60, near),
    ]);
    expect(insights).toHaveLength(1);
    expect(insights[0].action).toEqual({
      kind: "reorder",
      label: "Ordenar por cercanía",
    });

    expect(
      getRouteInsights([
        stop(1, ["A"], 60, a),
        stop(2, ["B"], 60, near),
        stop(3, ["C"], 60, far),
      ]),
    ).toEqual([]);
  });

  it("never returns more than two notes", () => {
    const a = { latitude: -32.9, longitude: -68.8 };
    const far = { latitude: -33.9, longitude: -68.8 };
    const near = { latitude: -32.95, longitude: -68.8 };
    const insights = getRouteInsights([
      stop(1, ["Bodega"], 60, a),
      stop(2, ["Bodega"], 60, far),
      stop(3, ["Bodega"], 60, near),
    ]);
    expect(insights.length).toBeLessThanOrEqual(MAX_INSIGHTS);
    expect(insights.map((insight) => insight.id)).toEqual([
      "nearest-order",
      "repeated-category",
    ]);
  });
});
