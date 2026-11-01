import { describe, expect, it } from "vitest";

import type { ExploreMapMarker } from "@/types";

import { markerIconUrl, markerPresentation } from "./markerIcon";

function activity(overrides: Record<string, unknown> = {}): ExploreMapMarker {
  return {
    itemType: "ACTIVITY",
    id: 1,
    activityId: 1,
    placeId: 1,
    name: "Cata",
    placeName: "Bodega",
    address: "",
    estimatedCost: null,
    type: null,
    averageRating: null,
    latitude: -32.9,
    longitude: -68.8,
    distanceKm: null,
    categories: [],
    place: null,
    ...overrides,
  } as ExploreMapMarker;
}

describe("map marker presentation", () => {
  it("uses the activity subtype first", () => {
    expect(markerPresentation(activity({ type: "meal" })).icon).toBe("utensils");
  });

  it("falls back to the place kind, then to the first category", () => {
    expect(
      markerPresentation(activity({ place: { kind: "park" } })).icon,
    ).toBe("trees");
    expect(
      markerPresentation(activity({ categories: [{ id: 3, name: "Culture" }] })).icon,
    ).toBe("drama");
  });

  it("uses a pin when nothing is known", () => {
    expect(markerPresentation(activity()).icon).toBe("map-pin");
  });

  it("uses the kind for a place", () => {
    const place = {
      itemType: "PLACE",
      kind: "museum",
      categories: [],
    } as unknown as ExploreMapMarker;
    expect(markerPresentation(place).icon).toBe("landmark");
  });

  it("draws the glyph inside an SVG badge", () => {
    const url = markerIconUrl({ icon: "utensils", color: "#c4622d" });
    const svg = decodeURIComponent(url.replace("data:image/svg+xml;charset=UTF-8,", ""));
    expect(svg).toContain('fill="#c4622d"');
    expect(svg).toMatch(/<svg[^>]*lucide-utensils/);
  });
});
