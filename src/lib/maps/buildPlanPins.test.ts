import { describe, expect, it } from "vitest";

import type { PlanDetailResult } from "@/types";

import { buildPlanPins } from "./buildPlanPins";
import { PLAN_PIN_COLORS } from "./brandedMapStyle";

function activityLocation(overrides: Partial<{ latitude: number | null; longitude: number | null }> = {}) {
  return {
    id: 1,
    latitude: -32.9,
    longitude: -68.8,
    notes: null,
    place: {
      id: 1,
      name: "Bodega Central",
      description: null,
      address: "Calle 1",
      department: {
        id: 1,
        name: "Luján de Cuyo",
        city: { id: 1, name: "Mendoza", country: { id: 1, name: "Argentina" } },
      },
    },
    ...overrides,
  };
}

function plan(overrides: Partial<PlanDetailResult> = {}): PlanDetailResult {
  return {
    id: 1,
    title: "Plan",
    description: null,
    estimatedTotalCost: 1000,
    estimatedTotalDuration: 60,
    activityCount: 1,
    averageRating: 0,
    distanceKm: null,
    categories: [],
    activityNames: [],
    status: { key: "generated", name: "Generated" },
    viewerPlanState: "selectable",
    activeOutingId: null,
    kind: "generated",
    visibility: "private",
    ownedByViewer: false,
    details: [],
    ...overrides,
  };
}

describe("buildPlanPins", () => {
  it("orders stops by their itinerary order, not by array order", () => {
    const pins = buildPlanPins([
      plan({
        details: [
          {
            id: 2,
            order: 2,
            estimatedCost: 0,
            estimatedDuration: 0,
            activity: { id: 20, name: "Segunda parada", description: "", estimatedCost: 0, estimatedDuration: 0, type: null, averageRating: 0, ratingCount: 0, categories: [], locations: [activityLocation({ latitude: -32.91, longitude: -68.81 })] },
          },
          {
            id: 1,
            order: 1,
            estimatedCost: 0,
            estimatedDuration: 0,
            activity: { id: 10, name: "Primera parada", description: "", estimatedCost: 0, estimatedDuration: 0, type: null, averageRating: 0, ratingCount: 0, categories: [], locations: [activityLocation({ latitude: -32.9, longitude: -68.8 })] },
          },
        ],
      }),
    ]);

    expect(pins[0].stops.map((s) => s.name)).toEqual(["Primera parada", "Segunda parada"]);
  });

  it("takes the first location with real coordinates when an activity has several", () => {
    const pins = buildPlanPins([
      plan({
        details: [
          {
            id: 1,
            order: 1,
            estimatedCost: 0,
            estimatedDuration: 0,
            activity: {
              id: 10,
              name: "Actividad",
              description: "",
              estimatedCost: 0,
              estimatedDuration: 0,
              type: null,
              averageRating: 0,
              ratingCount: 0,
              categories: [],
              locations: [
                activityLocation({ latitude: null, longitude: null }),
                activityLocation({ latitude: -32.95, longitude: -68.85 }),
              ],
            },
          },
        ],
      }),
    ]);

    expect(pins[0].stops).toEqual([
      { activityId: 10, name: "Actividad", lat: -32.95, lng: -68.85, order: 1 },
    ]);
  });

  it("drops stops with no usable coordinates instead of producing a broken pin", () => {
    const pins = buildPlanPins([
      plan({
        details: [
          {
            id: 1,
            order: 1,
            estimatedCost: 0,
            estimatedDuration: 0,
            activity: {
              id: 10,
              name: "Sin ubicación",
              description: "",
              estimatedCost: 0,
              estimatedDuration: 0,
              type: null,
              averageRating: 0,
              ratingCount: 0,
              categories: [],
              locations: [],
            },
          },
        ],
      }),
    ]);

    expect(pins[0].stops).toEqual([]);
  });

  it("assigns a distinct color per plan, cycling if there are more plans than colors", () => {
    const plans = Array.from({ length: PLAN_PIN_COLORS.length + 1 }, (_, index) =>
      plan({ id: index + 1, details: [] }),
    );

    const pins = buildPlanPins(plans);

    expect(pins.map((pin) => pin.color)).toEqual([...PLAN_PIN_COLORS, PLAN_PIN_COLORS[0]]);
  });

  describe("the Hogar (#210)", () => {
    const stop = (id: number, order: number, name: string, atHome: boolean) => ({
      id,
      order,
      estimatedCost: 0,
      estimatedDuration: 0,
      activity: {
        id: id * 10,
        name,
        description: "",
        estimatedCost: 0,
        estimatedDuration: 0,
        type: null,
        averageRating: 0,
        ratingCount: 0,
        categories: [],
        locations: [
          atHome
            ? { ...activityLocation({ latitude: null, longitude: null }), atHome: true }
            : activityLocation({ latitude: -32.9 - id / 100, longitude: -68.8 }),
        ],
      },
    });
    const start = { latitude: -32.89, longitude: -68.84 };

    it("numbers pins by their place in the itinerary, skipping an unpinned Hogar", () => {
      const pins = buildPlanPins([
        plan({ details: [stop(1, 1, "Museo", false), stop(2, 2, "Truco", true), stop(3, 3, "Cena", false)] }),
      ]);
      expect(pins[0].stops.map(({ name, order }) => [name, order])).toEqual([
        ["Museo", 1],
        ["Cena", 3],
      ]);
    });

    it("pins the Hogar at the starting point when the plan also goes out", () => {
      const pins = buildPlanPins(
        [plan({ details: [stop(1, 1, "Museo", false), stop(2, 2, "Truco", true)] })],
        start,
      );
      expect(pins[0].stops.at(-1)).toEqual({
        activityId: 20,
        name: "Truco",
        lat: start.latitude,
        lng: start.longitude,
        order: 2,
        atHome: true,
      });
    });

    it("leaves a plan entirely at home without pins, even with a starting point", () => {
      const pins = buildPlanPins(
        [plan({ details: [stop(1, 1, "Truco", true), stop(2, 2, "Rummy", true)] })],
        start,
      );
      expect(pins[0].stops).toEqual([]);
    });
  });
});
