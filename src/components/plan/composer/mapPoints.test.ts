import { describe, expect, it } from "vitest";

import type {
  ActivityDetailResult,
  ActivityMapMarker,
  ActivitySearchResult,
} from "@/types";

import {
  candidatesFromAssistant,
  candidatesFromMarkers,
  countActivities,
  summaryFromDetail,
  withoutStops,
} from "./mapPoints";

function marker(
  id: number,
  activityId: number,
  placeName: string,
): ActivityMapMarker {
  return {
    id,
    activityId,
    placeId: id * 10,
    name: `Actividad ${activityId}`,
    placeName,
    address: "Calle 123",
    estimatedCost: 1000,
    type: null,
    averageRating: 4.5,
    latitude: -32.89 - id / 1000,
    longitude: -68.84,
    distanceKm: null,
    categories: [],
  };
}

const summary: ActivitySearchResult = {
  id: 7,
  name: "Tango",
  description: "Show",
  estimatedCost: 5000,
  estimatedDuration: 90,
  type: null,
  averageRating: 4,
  ratingCount: 3,
  distanceKm: null,
  categories: [],
};

function detail(
  locations: { id: number; latitude: number | null; longitude: number | null }[],
): ActivityDetailResult {
  return {
    ...summary,
    images: [],
    locations: locations.map((location) => ({
      ...location,
      notes: null,
      place: {
        id: location.id * 10,
        name: `Lugar ${location.id}`,
        description: null,
        address: "Calle",
        department: {
          id: 1,
          name: "Capital",
          city: { id: 1, name: "Mendoza", country: { id: 1, name: "AR" } },
        },
      },
    })),
  };
}

describe("mapPoints", () => {
  it("draws one marker per place of an activity with two places", () => {
    const candidates = candidatesFromMarkers([
      marker(1, 7, "Centro"),
      marker(2, 7, "Chacras"),
      marker(3, 8, "Parque"),
    ]);
    expect(candidates.map((candidate) => candidate.key)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
    expect(candidates.filter((candidate) => candidate.activityId === 7)).toHaveLength(2);
    // ...but it is still one activity in the count.
    expect(countActivities(candidates)).toBe(2);
  });

  it("hides every place of an activity once it is a stop", () => {
    const candidates = candidatesFromMarkers([
      marker(1, 7, "Centro"),
      marker(2, 7, "Chacras"),
      marker(3, 8, "Parque"),
    ]);
    expect(withoutStops(candidates, new Set([7])).map((c) => c.key)).toEqual([
      "p3",
    ]);
  });

  it("places the assistant's answers with the catalog's own coordinates", () => {
    const candidates = candidatesFromAssistant(
      [{ activity: summary, reason: "Tiene música en vivo" }],
      () =>
        detail([
          { id: 11, latitude: -32.89, longitude: -68.84 },
          { id: 12, latitude: null, longitude: null },
          { id: 13, latitude: -33.0, longitude: -68.87 },
        ]),
    );
    expect(candidates.map((candidate) => candidate.key)).toEqual(["p11", "p13"]);
    expect(candidates[0].reason).toBe("Tiene música en vivo");
    expect(candidates[1].placeName).toBe("Lugar 13");
  });

  it("leaves out answers whose places are not known yet", () => {
    expect(
      candidatesFromAssistant([{ activity: summary, reason: null }], () => undefined),
    ).toEqual([]);
  });

  it("builds a stop's summary without the detail's places", () => {
    const stop = summaryFromDetail(
      detail([{ id: 11, latitude: -32.89, longitude: -68.84 }]),
      2.4,
    );
    expect(stop).not.toHaveProperty("locations");
    expect(stop.estimatedDuration).toBe(90);
    expect(stop.distanceKm).toBe(2.4);
  });
});
