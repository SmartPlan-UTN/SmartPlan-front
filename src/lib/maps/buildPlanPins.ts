import type { PlanDetailResult } from "@/types";

import { PLAN_PIN_COLORS } from "./brandedMapStyle";

export interface ResultsMapStop {
  activityId: number;
  name: string;
  lat: number;
  lng: number;
  order: number;
}

export interface ResultsMapPlanPin {
  planId: number;
  color: string;
  stops: ResultsMapStop[];
}

/**
 * Turns generated plans into map-ready pins (CU17). `plan_detail` only
 * references an activity, not a specific `activity_place` row, so when an
 * activity has more than one location there's no record of which one this
 * plan occurrence means — this takes the first location with real
 * coordinates as a deterministic v1 simplification, not a random pick.
 */
export function buildPlanPins(plans: PlanDetailResult[]): ResultsMapPlanPin[] {
  return plans.map((plan, index) => ({
    planId: plan.id,
    color: PLAN_PIN_COLORS[index % PLAN_PIN_COLORS.length],
    stops: [...plan.details]
      .sort((a, b) => a.order - b.order)
      .map((detail): ResultsMapStop | null => {
        const location = detail.activity.locations.find(
          (candidate) => candidate.latitude != null && candidate.longitude != null,
        );
        if (!location || location.latitude == null || location.longitude == null) {
          return null;
        }
        return {
          activityId: detail.activity.id,
          name: detail.activity.name,
          lat: location.latitude,
          lng: location.longitude,
          order: detail.order,
        };
      })
      .filter((stop): stop is ResultsMapStop => stop !== null),
  }));
}
