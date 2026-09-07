import type {
  CreateRatingInput,
  ListRatingsParams,
  OwnRating,
  PaginatedResult,
  PublicRating,
  RatingSummary,
  UpdateRatingInput,
} from '@/types';
import { apiClient } from './client';

/**
 * Fetches the signed-in user's own rating for an activity, if any (CU44's
 * "impedir valorar dos veces", CU46, CU47). `null` when they haven't rated
 * it yet — not a 404: `SmartPlan-back`'s `findOwn` resolves the absence
 * itself rather than throwing.
 * Backend contract: `GET /activities/:activityId/ratings/me`.
 */
export async function getOwnRating(activityId: number): Promise<OwnRating | null> {
  return apiClient.get<OwnRating | null>(`/activities/${activityId}/ratings/me`);
}

/**
 * Submits a rating for an activity (CU44). `planId` must reference one of
 * the caller's own completed plans that included this activity, or the
 * backend answers `409 RATING_EXPERIENCE_REQUIRED` — see
 * `ActivityRatingSection` for how that's resolved before this is ever
 * called.
 * Backend contract: `POST /activities/:activityId/ratings`.
 */
export async function createRating(
  activityId: number,
  data: CreateRatingInput
): Promise<OwnRating> {
  return apiClient.post<OwnRating>(`/activities/${activityId}/ratings`, data);
}

/**
 * Lists an activity's approved ratings, paginated, alongside the aggregate
 * shown above them (CU45). `summary` sits next to `data`/`pagination` in
 * the same response instead of a separate request — `RatingsService.
 * listPublic` computes both together server-side.
 * Backend contract: `GET /activities/:activityId/ratings`.
 */
export async function listRatings(
  activityId: number,
  params: ListRatingsParams = {}
): Promise<PaginatedResult<PublicRating> & { summary: RatingSummary }> {
  return apiClient.get<PaginatedResult<PublicRating> & { summary: RatingSummary }>(
    `/activities/${activityId}/ratings`,
    { params }
  );
}

/**
 * Edits the caller's own rating (CU46). `SmartPlan-back` re-runs moderation
 * on the new comment when one is sent, so `updatedAt` and, potentially,
 * `moderationStatus`/`moderationReason` on the response can differ from the
 * pre-edit rating even when the score didn't change.
 * Backend contract: `PATCH /ratings/:id`.
 */
export async function updateRating(
  ratingId: number,
  data: UpdateRatingInput
): Promise<OwnRating> {
  return apiClient.patch<OwnRating>(`/ratings/${ratingId}`, data);
}

/**
 * Deletes the caller's own rating (CU47). Soft-deleted server-side; the
 * caller is expected to re-fetch the activity's rating list/summary
 * afterward so the average shown reflects the removal.
 * Backend contract: `DELETE /ratings/:id` (204, no body).
 */
export async function deleteRating(ratingId: number): Promise<void> {
  await apiClient.delete<void>(`/ratings/${ratingId}`);
}
