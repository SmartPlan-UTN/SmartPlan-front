import type {
  ActivitySearchResult,
  OwnPlanDetail,
  PlanVisibility,
} from "@/types";

export interface ComposerStop {
  activity: ActivitySearchResult;
  detailId?: number;
  estimatedCost: number;
  estimatedDuration: number;
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
    stops: (plan?.details ?? []).map((detail) => ({
      detailId: detail.id,
      estimatedCost: detail.estimatedCost,
      estimatedDuration: detail.estimatedDuration,
      activity: {
        id: detail.activity.id,
        name: detail.activity.name,
        description: detail.activity.description,
        estimatedCost: detail.activity.estimatedCost,
        estimatedDuration: detail.activity.estimatedDuration,
        type: detail.activity.type,
        averageRating: 0,
        ratingCount: 0,
        distanceKm: null,
        categories: [],
      },
    })),
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
      estimatedDuration: stop.estimatedDuration,
    })),
  });
}
