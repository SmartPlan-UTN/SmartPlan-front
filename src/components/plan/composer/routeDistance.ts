export interface Coords {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

/** Straight-line distance between two points, in km (haversine). */
export function distanceKm(a: Coords, b: Coords): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** First meeting point that has coordinates, if any. */
export function firstCoords(
  locations: readonly {
    latitude: number | null;
    longitude: number | null;
  }[],
): Coords | null {
  for (const { latitude, longitude } of locations) {
    if (latitude !== null && longitude !== null) return { latitude, longitude };
  }
  return null;
}

/**
 * Km of each leg between consecutive stops, `null` where either end has no
 * known position. Index i is the leg from stop i to stop i + 1.
 */
export function routeLegs(stops: readonly { coords?: Coords | null }[]) {
  return stops.slice(1).map((stop, index) => {
    const from = stops[index].coords;
    const to = stop.coords;
    return from && to ? distanceKm(from, to) : null;
  });
}

/** "≈ 850 m" / "≈ 12 km": a straight line, never a driving estimate. */
export function formatLeg(km: number): string {
  if (km < 1) return `≈ ${Math.max(Math.round(km * 10) * 100, 100)} m`;
  return `≈ ${km.toLocaleString("es-AR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

/** Total km of a visiting order, ignoring legs with an unknown end. */
export function totalLegKm(stops: readonly { coords?: Coords | null }[]) {
  return routeLegs(stops).reduce<number>((sum, leg) => sum + (leg ?? 0), 0);
}

/**
 * Nearest-neighbour order starting from the first stop. Only a candidate: it
 * is offered to the person and applied on request, never on its own.
 */
export function nearestOrder<T extends { coords?: Coords | null }>(
  stops: readonly T[],
): T[] {
  if (stops.length < 3 || stops.some((stop) => !stop.coords)) {
    return [...stops];
  }
  const remaining = stops.slice(1);
  const ordered = [stops[0]];
  while (remaining.length) {
    const last = ordered[ordered.length - 1].coords as Coords;
    let best = 0;
    let bestKm = Infinity;
    remaining.forEach((stop, index) => {
      const km = distanceKm(last, stop.coords as Coords);
      if (km < bestKm) {
        bestKm = km;
        best = index;
      }
    });
    ordered.push(remaining.splice(best, 1)[0]);
  }
  return ordered;
}
