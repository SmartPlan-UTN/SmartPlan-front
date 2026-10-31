import type {
  ActivitySearchResult,
  OwnPlanDetail,
  PlanVisibility,
  PlanComposerStopDto,
  PlanStopPlace,
} from "@/types";
import type { Price } from "@/types/pricing";

import type { Coords } from "./routeDistance";

export interface ComposerStop {
  /** Place target is persisted as a Place Action, never as an Activity row. */
  placeTarget?: { placeId: number; action: string };
  perPersonCost?: number | null;
  activity: ActivitySearchResult;
  detailId?: number;
  /** Lower bound of the stop price; `null` when it is unknown (never 0). */
  estimatedCost: number | null;
  /** Price snapshot (saved stops) or the activity price (new stops). */
  price?: Price | null;
  estimatedDuration: number;
  /**
   * Where the activity happens. Never stored in the draft: the route panel
   * fills it in from `useStopInfo` lookups to measure legs.
   */
  coords?: Coords | null;
}

export interface ComposerDraft {
  title: string;
  description: string;
  peopleCount: number;
  visibility: PlanVisibility;
  stops: ComposerStop[];
}

export function composerTarget(stop: ComposerStop): PlanComposerStopDto {
  return {
    ...(stop.placeTarget ?? { activityId: stop.activity.id }),
  };
}

/** Adapt a place to the timeline's display model. A persisted detail supplies
 * its own negative row ID. The composer assigns new rows a decreasing ID so
 * different actions and undo never share a key. Only placeTarget is persisted. */
export function placeComposerStop(
  place: Pick<PlanStopPlace, 'id' | 'name' | 'latitude' | 'longitude'>,
  action: { action: string; label: string; durationMinutes: number; price?: Price | null },
  rowId = -place.id,
): ComposerStop {
  return {
    placeTarget: { placeId: place.id, action: action.action },
    estimatedCost: action.price?.kind === 'FREE' ? 0 : null,
    price: action.price ?? null,
    estimatedDuration: action.durationMinutes,
    coords: place.latitude !== null && place.longitude !== null
      ? { latitude: place.latitude, longitude: place.longitude } : null,
    activity: {
      id: rowId, name: place.name, description: action.label,
      estimatedCost: action.price?.kind === 'FREE' ? 0 : null,
      price: action.price ?? null, estimatedDuration: action.durationMinutes,
      type: action.action, averageRating: 0, ratingCount: 0, distanceKm: null, categories: [],
    },
  };
}

export function createInitialDraft(plan?: OwnPlanDetail): ComposerDraft {
  return {
    title: plan?.title ?? "",
    description: plan?.description ?? "",
    peopleCount: plan?.peopleCount ?? 2,
    visibility: plan?.visibility ?? "private",
    stops: (plan?.details ?? []).map((detail) => {
      const activity = detail.activity;
      if (!activity) {
        const place = detail.stop?.place;
        const action = detail.stop?.action;
        if (!place || !action) throw new Error('A composer stop needs a valid target.');
        return {
          ...placeComposerStop(place, { action, label: detail.stop?.actionLabel ?? '', durationMinutes: detail.estimatedDuration, price: detail.price }, -detail.id),
          detailId: detail.id, estimatedCost: detail.estimatedCost,
        };
      }
      return {
        detailId: detail.id,
        estimatedCost: detail.estimatedCost,
        price: detail.price ?? null,
        perPersonCost: detail.perPersonCost,
        estimatedDuration: detail.estimatedDuration,
        activity: {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        estimatedCost: activity.estimatedCost,
        price: activity.price ?? null,
        estimatedDuration: activity.estimatedDuration,
        type: activity.type,
        averageRating: 0,
        ratingCount: 0,
        distanceKm: null,
        categories: [],
        },
      };
    }),
  };
}

export function getDraftKey(draft: ComposerDraft): string {
  return JSON.stringify({
    title: draft.title,
    description: draft.description,
    peopleCount: draft.peopleCount,
    visibility: draft.visibility,
    stops: draft.stops.map((stop) => ({
      target: composerTarget(stop),
      detailId: stop.detailId ?? null,
      estimatedCost: stop.estimatedCost,
      priceKind: stop.price?.kind ?? null,
      estimatedDuration: stop.estimatedDuration,
    })),
  });
}
