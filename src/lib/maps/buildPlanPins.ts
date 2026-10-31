import { isHomeStop, stopCoordinates, stopLabel } from "@/lib/plans/stops";
import type { PlanDetailResult } from "@/types";

import { PLAN_PIN_COLORS } from "./brandedMapStyle";

export interface ResultsMapStop {
  /** The catalog activity behind the stop; `null` for a place-action stop. */
  activityId: number | null;
  name: string;
  lat: number;
  lng: number;
  order: number;
  atHome?: boolean;
}

export interface ResultsMapPlanPin {
  planId: number;
  color: string;
  stops: ResultsMapStop[];
}

/**
 * Turns generated plans into map-ready pins (CU17). An activity stop uses
 * its first location with real coordinates (a deterministic v1
 * simplification when it has several); a place-action stop uses its place's
 * SmartPlan-owned position. A stop SmartPlan only knows approximately is
 * not drawn: a pin is never placed where the stop is not.
 */
export function buildPlanPins(
  plans: PlanDetailResult[],
  startingPoint: { latitude: number; longitude: number } | null = null,
): ResultsMapPlanPin[] {
  return plans.map((plan, index) => ({
    planId: plan.id,
    color: PLAN_PIN_COLORS[index % PLAN_PIN_COLORS.length],
    stops: [...plan.details]
      .sort((a, b) => a.order - b.order)
      .map((detail, stopIndex): ResultsMapStop | null => {
        const atHome = isHomeStop(detail);
        const goesOut = plan.details.some((item) => !isHomeStop(item));
        const point = atHome ? (goesOut ? startingPoint : null) : stopCoordinates(detail);
        if (!point) return null;
        return {
          activityId: detail.activity?.id ?? null,
          name: stopLabel(detail),
          lat: point.latitude,
          lng: point.longitude,
          order: stopIndex + 1,
          ...(atHome ? { atHome: true } : {}),
        };
      })
      .filter((stop): stop is ResultsMapStop => stop !== null),
  }));
}
