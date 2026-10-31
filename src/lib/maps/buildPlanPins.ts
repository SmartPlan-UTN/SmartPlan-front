import type { PlanDetailResult, ResolvedPlanContext } from "@/types";
import { isAtHomeActivity, isAtHomeLocation } from "@/lib/utils/home";

import { PLAN_PIN_COLORS } from "./brandedMapStyle";

export interface ResultsMapStop {
  activityId: number;
  name: string;
  lat: number;
  lng: number;
  /** Position in the itinerary, so the pin number matches the list. */
  order: number;
  /** A stop at the Hogar, pinned at the starting point (#210). */
  atHome?: boolean;
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
 *
 * A stop at the Hogar happens wherever the group is (#210): it is pinned at
 * the request's starting point when the plan also goes out, so the route
 * ends at home. A plan entirely at home has no route and no pins.
 */
export function buildPlanPins(
  plans: PlanDetailResult[],
  startingPoint: ResolvedPlanContext["startingPoint"] = null,
): ResultsMapPlanPin[] {
  return plans.map((plan, index) => {
    const itinerary = [...plan.details].sort((a, b) => a.order - b.order);
    const stops = itinerary.map((detail, position): ResultsMapStop | null => {
      const location = detail.activity.locations.find(
        (candidate) =>
          !isAtHomeLocation(candidate) &&
          candidate.latitude != null &&
          candidate.longitude != null,
      );
      if (location && location.latitude != null && location.longitude != null) {
        return {
          activityId: detail.activity.id,
          name: detail.activity.name,
          lat: location.latitude,
          lng: location.longitude,
          order: position + 1,
        };
      }
      if (startingPoint && isAtHomeActivity(detail.activity)) {
        return {
          activityId: detail.activity.id,
          name: detail.activity.name,
          lat: startingPoint.latitude,
          lng: startingPoint.longitude,
          order: position + 1,
          atHome: true,
        };
      }
      return null;
    });
    const located = stops.filter((stop): stop is ResultsMapStop => stop !== null);
    return {
      planId: plan.id,
      color: PLAN_PIN_COLORS[index % PLAN_PIN_COLORS.length],
      stops: located.some((stop) => !stop.atHome) ? located : [],
    };
  });
}
