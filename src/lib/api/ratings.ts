import type {
  CreateRatingInput,
  ListRatingsParams,
  OwnRating,
  PaginatedResult,
  PublicRating,
  RatingSummary,
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
