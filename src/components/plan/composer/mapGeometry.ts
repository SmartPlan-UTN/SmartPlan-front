import { distanceKm, type Coords } from "./routeDistance";

/** A map viewport or a box around points, in degrees (no antimeridian wrap). */
export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Everything the catalog can hold: one request answers the whole query. */
export const WORLD_BOUNDS: Bounds = {
  south: -85,
  west: -179.9,
  north: 85,
  east: 179.9,
};

/** The "Buscar en esta zona" circle can't be smaller or larger than this. */
export const AREA_RADIUS_KM = { min: 0.5, max: 500 } as const;

export function boundsOf(points: readonly Coords[]): Bounds | null {
  if (points.length === 0) return null;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const { latitude, longitude } of points) {
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
  }
  return { south, west, north, east };
}

export function boundsCenter(bounds: Bounds): Coords {
  return {
    latitude: (bounds.south + bounds.north) / 2,
    longitude: (bounds.west + bounds.east) / 2,
  };
}

/** The box grown by `factor` around its centre (1.5 = half as big again). */
export function padBounds(bounds: Bounds, factor: number): Bounds {
  const latPad = ((bounds.north - bounds.south) * (factor - 1)) / 2;
  const lngPad = ((bounds.east - bounds.west) * (factor - 1)) / 2;
  return {
    south: Math.max(bounds.south - latPad, WORLD_BOUNDS.south),
    west: Math.max(bounds.west - lngPad, WORLD_BOUNDS.west),
    north: Math.min(bounds.north + latPad, WORLD_BOUNDS.north),
    east: Math.min(bounds.east + lngPad, WORLD_BOUNDS.east),
  };
}

export function boundsContain(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.south >= outer.south &&
    inner.north <= outer.north &&
    inner.west >= outer.west &&
    inner.east <= outer.east
  );
}

/** Corner-to-corner distance, in km. */
export function diagonalKm(bounds: Bounds): number {
  return distanceKm(
    { latitude: bounds.south, longitude: bounds.west },
    { latitude: bounds.north, longitude: bounds.east },
  );
}

/**
 * The circle a viewport becomes when the person asks to search there: centred
 * on it and as wide as its shorter side, so the whole zone is visible and
 * drawn on the map, and what is outside the ring is visibly outside. The
 * catalog filters by distance from a point, so a circle is what both views
 * can share. Rounded to what the API accepts (6 decimals, 0.1 km).
 */
export function areaFromBounds(bounds: Bounds): {
  center: Coords;
  radiusKm: number;
} {
  const center = boundsCenter(bounds);
  const widthKm = distanceKm(
    { latitude: center.latitude, longitude: bounds.west },
    { latitude: center.latitude, longitude: bounds.east },
  );
  const heightKm = distanceKm(
    { latitude: bounds.south, longitude: center.longitude },
    { latitude: bounds.north, longitude: center.longitude },
  );
  const radius = Math.min(widthKm, heightKm) / 2;
  return {
    center: roundCoords(center),
    radiusKm:
      Math.round(
        Math.min(Math.max(radius, AREA_RADIUS_KM.min), AREA_RADIUS_KM.max) * 10,
      ) / 10,
  };
}

/** The API takes coordinates with at most 6 decimals (~10 cm). */
export function roundCoords({ latitude, longitude }: Coords): Coords {
  return {
    latitude: Math.round(latitude * 1e6) / 1e6,
    longitude: Math.round(longitude * 1e6) / 1e6,
  };
}

/**
 * Whether the camera has moved far enough from `reference` for "Buscar en
 * esta zona" to mean something new: the centre travelled a fifth of the old
 * view, or the view got much bigger or smaller.
 */
export function movedAway(reference: Bounds, current: Bounds): boolean {
  const referenceKm = diagonalKm(reference);
  if (referenceKm === 0) return true;
  const shift = distanceKm(boundsCenter(reference), boundsCenter(current));
  const scale = diagonalKm(current) / referenceKm;
  return shift / referenceKm > 0.2 || scale > 1.6 || scale < 0.6;
}

/**
 * The box worth framing: the points without their far outliers, so one
 * excursion 100 km away does not shrink the whole city to a dot. A point is
 * an outlier when it is much farther from the median point than the rest
 * (more than three times the median distance, and at least 4 km out).
 * `outside` counts what was left out so the map can say so.
 */
export function coreBounds(points: readonly Coords[]): {
  bounds: Bounds | null;
  outside: number;
} {
  if (points.length < 4) return { bounds: boundsOf(points), outside: 0 };
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const center = {
    latitude: median(points.map((point) => point.latitude)),
    longitude: median(points.map((point) => point.longitude)),
  };
  const distances = points.map((point) => distanceKm(center, point));
  const limit = Math.max(median(distances) * 3, 4);
  const kept = points.filter((_, index) => distances[index] <= limit);
  return { bounds: boundsOf(kept), outside: points.length - kept.length };
}
