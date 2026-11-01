import { describe, expect, it } from "vitest";

import type { PlanDetailResult, PlanItineraryActivity } from "@/types";

import { getPlanZone } from "./planZone";

function detail(
  order: number,
  locations: PlanItineraryActivity["locations"],
): PlanDetailResult["details"][number] {
  return {
    id: order,
    order,
    estimatedCost: 0,
    estimatedDuration: 0,
    activity: {
      id: order,
      name: `Parada ${order}`,
      description: "",
      estimatedCost: 0,
      estimatedDuration: 0,
      type: null,
      averageRating: 0,
      ratingCount: 0,
      categories: [],
      locations,
    },
  };
}

function place(departmentName: string) {
  return {
    id: 1,
    name: "Lugar",
    description: null,
    address: "Calle 1",
    department: {
      id: 1,
      name: departmentName,
      city: { id: 1, name: "Mendoza", country: { id: 1, name: "Argentina" } },
    },
  };
}

function plan(details: PlanDetailResult["details"]): PlanDetailResult {
  return {
    id: 1,
    title: "Plan",
    description: null,
    estimatedTotalCost: 0,
    estimatedTotalDuration: 0,
    activityCount: details.length,
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
    details,
  };
}

describe("getPlanZone", () => {
  it("returns the department of the first stop (in order) that has a location", () => {
    const result = getPlanZone(
      plan([
        detail(2, [{ id: 1, latitude: null, longitude: null, notes: null, place: place("Godoy Cruz") }]),
        detail(1, []),
      ]),
    );

    expect(result).toBe("Godoy Cruz");
  });

  it("returns null when no activity on the plan has a location", () => {
    expect(getPlanZone(plan([detail(1, []), detail(2, [])]))).toBeNull();
  });

  it("reads the department of a place-action stop (no activity behind it)", () => {
    const placeStop: PlanDetailResult["details"][number] = {
      id: 9,
      order: 1,
      estimatedCost: null,
      estimatedDuration: 100,
      activity: null,
      stop: {
        kind: "PLACE_ACTION",
        label: "Cena en Anna Bistró",
        action: "meal",
        actionLabel: "Almuerzo o cena",
        activityId: null,
        place: {
          id: 23,
          name: "Anna Bistró",
          address: null,
          kind: "restaurant",
          kindLabel: "Restaurante",
          latitude: null,
          longitude: null,
          googlePlaceId: "ChIJ-anna",
          departmentName: "Ciudad de Mendoza",
        },
        startMinute: 1260,
        legTravelMinutes: null,
        legDistanceMeters: null,
        estimateBasis: null,
      },
    };
    expect(getPlanZone(plan([placeStop]))).toBe("Ciudad de Mendoza");
  });
});

it("skips the home and reads a later legacy location with a department", () => {
  const home = detail(1, [{ id: 1, latitude: null, longitude: null, notes: null,
    atHome: true, place: { ...place("Wrong zone"), kind: "home" } }]);
  const outside = detail(2, [
    { id: 2, latitude: null, longitude: null, notes: null, place: { ...place(""), department: null } },
    { id: 3, latitude: null, longitude: null, notes: null, place: place("Capital") },
  ]);
  expect(getPlanZone(plan([home]))).toBeNull();
  expect(getPlanZone(plan([home, outside]))).toBe("Capital");
});
