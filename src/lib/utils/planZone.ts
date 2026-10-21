import type { PlanDetailResult } from "@/types";

/**
 * The zone/department a plan happens in, for the card's meta row (CU17).
 * Takes the first stop (in itinerary order) that has any recorded
 * location — a department name doesn't need coordinates, unlike a map pin —
 * and falls back to `null` when nothing on the plan has a location at all,
 * the same optional-field pattern already used for `distanceKm`.
 */
export function getPlanZone(plan: PlanDetailResult): string | null {
  const withLocation = [...plan.details]
    .sort((a, b) => a.order - b.order)
    .find((detail) => detail.activity.locations.length > 0);

  return withLocation?.activity.locations[0]?.place.department.name ?? null;
}
