import { isAtHomeLocation } from "./home";
import { isHomeStop, stopPlace } from "@/lib/plans/stops";
import type { PlanDetailResult } from "@/types";

/**
 * The zone/department a plan happens in, for the card's meta row (CU17).
 * Takes the first stop (in itinerary order) whose place is known — a
 * department name doesn't need coordinates, unlike a map pin — and falls
 * back to `null` when nothing on the plan has a place at all.
 */
export function getPlanZone(plan: PlanDetailResult): string | null {
  for (const detail of [...plan.details].sort((a, b) => a.order - b.order)) {
    if (isHomeStop(detail)) continue;
    const department = stopPlace(detail)?.departmentName;
    if (department) return department;
    const located = (detail.activity?.locations ?? []).find(
      (location) => !isAtHomeLocation(location) && location.place.department,
    );
    if (located) return located.place.department?.name ?? null;
  }
  return null;
}
