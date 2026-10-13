import type {
  ActivityCategorySummary,
  ActivityDetailResult,
  ActivityMapMarker,
  ActivitySearchResult,
} from "@/types";

/**
 * One marker on the discovery map. An activity can happen at several places
 * (`activity_place`), so a marker is a *place* of an activity: its `key` is
 * the place link's id, and `activityId` ties the markers of one activity
 * together. Selecting any of them selects the activity; adding adds it once.
 */
export interface MapCandidate {
  key: string;
  activityId: number;
  name: string;
  placeName: string | null;
  latitude: number;
  longitude: number;
  estimatedCost: number;
  averageRating: number;
  /** Measured by the server from the search's location, when there is one. */
  distanceKm: number | null;
  categories: ActivityCategorySummary[];
  /** The full summary, when the source already carried it (the assistant). */
  activity?: ActivitySearchResult;
  /** Why the assistant picked it, in its words. */
  reason?: string | null;
}

/** Same key for the same place whichever source reported it. */
function placeKey(placeLinkId: number): string {
  return `p${placeLinkId}`;
}

export function candidatesFromMarkers(
  markers: readonly ActivityMapMarker[],
): MapCandidate[] {
  return markers.map((marker) => ({
    key: placeKey(marker.id),
    activityId: marker.activityId,
    name: marker.name,
    placeName: marker.placeName || null,
    latitude: marker.latitude,
    longitude: marker.longitude,
    estimatedCost: marker.estimatedCost,
    averageRating: marker.averageRating,
    distanceKm: marker.distanceKm,
    categories: marker.categories,
  }));
}

/**
 * The assistant answers with activities, not places: each located place of
 * each answer becomes a marker. Positions come from the catalog's own detail,
 * never from the assistant.
 */
export function candidatesFromAssistant(
  results: readonly { activity: ActivitySearchResult; reason: string | null }[],
  detailOf: (activityId: number) => ActivityDetailResult | null | undefined,
): MapCandidate[] {
  const candidates: MapCandidate[] = [];
  for (const { activity, reason } of results) {
    const detail = detailOf(activity.id);
    if (!detail) continue;
    for (const location of detail.locations) {
      if (location.latitude === null || location.longitude === null) continue;
      candidates.push({
        key: placeKey(location.id),
        activityId: activity.id,
        name: activity.name,
        placeName: location.place?.name ?? null,
        latitude: location.latitude,
        longitude: location.longitude,
        estimatedCost: activity.estimatedCost,
        averageRating: activity.averageRating,
        distanceKm: activity.distanceKm,
        categories: activity.categories,
        activity,
        reason,
      });
    }
  }
  return candidates;
}

/** Results count activities, never markers. */
export function countActivities(candidates: readonly MapCandidate[]): number {
  return new Set(candidates.map((candidate) => candidate.activityId)).size;
}

/**
 * What the map draws as results: a stop is drawn once, as its numbered
 * stop, so none of its places shows a result dot as well.
 */
export function withoutStops(
  candidates: readonly MapCandidate[],
  stopActivityIds: ReadonlySet<number>,
): MapCandidate[] {
  return candidates.filter(
    (candidate) => !stopActivityIds.has(candidate.activityId),
  );
}

/**
 * The summary a stop is made of. A detail lookup carries more than a stop
 * needs (places, images), so only the summary's own fields are kept.
 */
export function summaryFromDetail(
  detail: ActivityDetailResult,
  distanceKm: number | null,
): ActivitySearchResult {
  return {
    id: detail.id,
    imageUrl: detail.imageUrl ?? null,
    name: detail.name,
    description: detail.description,
    estimatedCost: detail.estimatedCost,
    estimatedDuration: detail.estimatedDuration,
    type: detail.type,
    averageRating: detail.averageRating,
    ratingCount: detail.ratingCount,
    distanceKm,
    categories: detail.categories,
  };
}
