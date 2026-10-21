import { describe, expect, it } from "vitest";

import {
  areaFromBounds,
  boundsContain,
  coreBounds,
  movedAway,
  padBounds,
} from "./mapGeometry";

const MENDOZA = { south: -32.92, west: -68.9, north: -32.86, east: -68.82 };

describe("mapGeometry", () => {
  it("pads a box around its centre and keeps the original inside", () => {
    const padded = padBounds(MENDOZA, 1.5);
    expect(boundsContain(padded, MENDOZA)).toBe(true);
    expect(padded.north - padded.south).toBeCloseTo(0.09, 6);
    expect(padded.east - padded.west).toBeCloseTo(0.12, 6);
  });

  it("knows when a viewport leaves the loaded box", () => {
    const loaded = padBounds(MENDOZA, 1.5);
    const panned = { ...MENDOZA, west: -68.99, east: -68.91 };
    expect(boundsContain(loaded, panned)).toBe(false);
  });

  it("turns a viewport into the circle that fits inside it", () => {
    const area = areaFromBounds(MENDOZA);
    expect(area.center.latitude).toBeCloseTo(-32.89, 6);
    expect(area.center.longitude).toBeCloseTo(-68.86, 6);
    // The shorter side is ~6.7 km tall → ~3.3 km radius.
    expect(area.radiusKm).toBeCloseTo(3.3, 1);
  });

  it("rounds the zone to what the API accepts", () => {
    const area = areaFromBounds({
      south: -32.91861520414,
      west: -68.80628578403,
      north: -32.85861520414,
      east: -68.72628578403,
    });
    const decimals = (value: number) =>
      value.toString().split(".")[1]?.length ?? 0;
    expect(decimals(area.center.latitude)).toBeLessThanOrEqual(6);
    expect(decimals(area.center.longitude)).toBeLessThanOrEqual(6);
    expect(decimals(area.radiusKm)).toBeLessThanOrEqual(1);
  });

  it("clamps the area radius to what the catalog accepts", () => {
    const tiny = {
      south: -32.89,
      west: -68.85,
      north: -32.8899,
      east: -68.8499,
    };
    expect(areaFromBounds(tiny).radiusKm).toBe(0.5);
    const huge = { south: -50, west: -75, north: -20, east: -50 };
    expect(areaFromBounds(huge).radiusKm).toBe(500);
  });

  it("only offers a new search after a real move", () => {
    const nudged = {
      south: MENDOZA.south + 0.002,
      west: MENDOZA.west + 0.002,
      north: MENDOZA.north + 0.002,
      east: MENDOZA.east + 0.002,
    };
    expect(movedAway(MENDOZA, nudged)).toBe(false);
    expect(movedAway(MENDOZA, padBounds(MENDOZA, 2.5))).toBe(true);
    expect(movedAway(MENDOZA, { ...MENDOZA, west: -68.95, east: -68.87 })).toBe(
      true,
    );
  });

  it("frames the city, not the excursion 100 km away", () => {
    const city = [
      { latitude: -32.8934, longitude: -68.8663 },
      { latitude: -32.8886, longitude: -68.8458 },
      { latitude: -32.8908, longitude: -68.8442 },
      { latitude: -32.8942, longitude: -68.8354 },
      { latitude: -32.9, longitude: -68.875 },
    ];
    const puenteDelInca = { latitude: -32.82, longitude: -69.92 };
    const { bounds, outside } = coreBounds([...city, puenteDelInca]);
    expect(outside).toBe(1);
    expect(bounds?.west).toBeCloseTo(-68.875, 6);
  });

  it("does not trim anything from a handful of points", () => {
    const { outside } = coreBounds([
      { latitude: -32.89, longitude: -68.84 },
      { latitude: -32.82, longitude: -69.92 },
    ]);
    expect(outside).toBe(0);
  });
});
