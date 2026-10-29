import { describe, expect, it } from "vitest";

import type { PlanDetailResult } from "@/types";

import { getPlanZone } from "./planZone";

function detail(
  order: number,
  locations: PlanDetailResult["details"][number]["activity"]["locations"],
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

  it("skips stops at the Hogar, which belong to no zone (#210)", () => {
    const home = { id: 9, name: "En casa / donde estén", description: null, address: "", kind: "home", department: null };
    expect(
      getPlanZone(
        plan([
          detail(1, [{ id: 2, atHome: true, latitude: -32.9, longitude: -68.8, notes: null, place: home }]),
          detail(2, [{ id: 3, latitude: null, longitude: null, notes: null, place: place("Maipú") }]),
        ]),
      ),
    ).toBe("Maipú");
    expect(
      getPlanZone(plan([detail(1, [{ id: 2, atHome: true, latitude: null, longitude: null, notes: null, place: home }])])),
    ).toBeNull();
  });
});
