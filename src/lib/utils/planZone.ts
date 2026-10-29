import { isAtHomeLocation } from "./home";
import type { PlanDetailResult } from "@/types";

/**
 * The zone/department a plan happens in, for the card's meta row (CU17).
 * Takes the first stop (in itinerary order) that has any recorded
 * location — a department name doesn't need coordinates, unlike a map pin —
 * and falls back to `null` when nothing on the plan has a location at all,
 * the same optional-field pattern already used for `distanceKm`.
 */
export function getPlanZone(plan: PlanDetailResult): string | null {
  // A stop at the Hogar is "wherever you are": it never names the zone.
  for (const detail of [...plan.details].sort((a, b) => a.order - b.order)) {
    const located = detail.activity.locations.find(
      (location) => !isAtHomeLocation(location) && location.place.department,
    );
    if (located) return located.place.department?.name ?? null;
  }
  return null;
}
