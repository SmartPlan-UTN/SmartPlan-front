import { describe, expect, it } from "vitest";

import {
  distanceKm,
  firstCoords,
  formatLeg,
  nearestOrder,
  routeLegs,
} from "./routeDistance";

const mendoza = { latitude: -32.8895, longitude: -68.8458 };
const maipu = { latitude: -32.9787, longitude: -68.7898 };

describe("routeDistance", () => {
  it("measures a straight line between two points", () => {
    expect(distanceKm(mendoza, mendoza)).toBe(0);
    expect(distanceKm(mendoza, maipu)).toBeGreaterThan(10);
    expect(distanceKm(mendoza, maipu)).toBeLessThan(13);
  });

  it("takes the first meeting point that has coordinates", () => {
    expect(firstCoords([])).toBeNull();
    expect(
      firstCoords([
        { latitude: null, longitude: null },
        { latitude: 1, longitude: 2 },
      ]),
    ).toEqual({ latitude: 1, longitude: 2 });
  });

  it("leaves a leg empty when either end has no position", () => {
    const legs = routeLegs([{ coords: mendoza }, { coords: null }, { coords: maipu }]);
    expect(legs).toEqual([null, null]);
  });

  it("formats legs as straight-line approximations", () => {
    expect(formatLeg(0.42)).toBe("≈ 400 m");
    expect(formatLeg(12.4)).toBe("≈ 12 km");
    expect(formatLeg(3.26)).toBe("≈ 3,3 km");
  });

  it("does not reorder when a position is missing", () => {
    const stops = [{ coords: mendoza }, { coords: null }, { coords: maipu }];
    expect(nearestOrder(stops)).toEqual(stops);
  });
});
