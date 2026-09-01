import type { CreateRatingInput, OwnRating } from '@/types';
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
