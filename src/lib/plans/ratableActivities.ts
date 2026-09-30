import { getOuting, getOwnRating } from "@/lib/api";
import type { OwnRating } from "@/types";

/** One activity of a completed outing, as the post-feedback step offers it. */
export interface RatableActivity {
  id: number;
  name: string;
  /** The person's current rating, editable through CU46, or `null`. */
  ownRating: OwnRating | null;
}

/**
 * The activities of a completed outing, in itinerary order and without
 * repeats, each with the person's own rating if there is one (CU23 → CU44/CU46).
 * The outing itself is the plan `POST /activities/:id/ratings` needs: it's
 * theirs, `completed`, and keeps its details.
 *
 * An own-rating lookup that fails counts as unrated: the step is optional,
 * and a duplicate comes back as `RATING_ALREADY_EXISTS`, which it handles.
 */
export async function loadRatableActivities(
  outingId: number
): Promise<RatableActivity[]> {
  const outing = await getOuting(outingId);
  const seen = new Set<number>();
  const activities = [...outing.details]
    .sort((a, b) => a.order - b.order)
    .map((detail) => detail.activity)
    .filter((activity) => {
      if (seen.has(activity.id)) return false;
      seen.add(activity.id);
      return true;
    });

  const own = await Promise.allSettled(
    activities.map((activity) => getOwnRating(activity.id))
  );

  return activities.map((activity, index) => {
    const result = own[index];
    return {
      id: activity.id,
      name: activity.name,
      ownRating: result.status === "fulfilled" ? result.value : null,
    };
  });
}
