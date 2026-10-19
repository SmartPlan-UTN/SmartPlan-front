import type {
  ActivitySearchResult,
  OwnPlanDetail,
  PlanVisibility,
} from "@/types";
import type { Price } from "@/types/pricing";

import type { Coords } from "./routeDistance";

export interface ComposerStop {
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

export function createInitialDraft(plan?: OwnPlanDetail): ComposerDraft {
  return {
    title: plan?.title ?? "",
    description: plan?.description ?? "",
    peopleCount: plan?.peopleCount ?? 2,
    visibility: plan?.visibility ?? "private",
    stops: (plan?.details ?? []).map((detail) => {
      const activity = detail.activity;
      if (!activity) throw new Error("A composer stop needs a catalog activity.");
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
      activityId: stop.activity.id,
      detailId: stop.detailId ?? null,
      estimatedCost: stop.estimatedCost,
      priceKind: stop.price?.kind ?? null,
      estimatedDuration: stop.estimatedDuration,
    })),
  });
}
