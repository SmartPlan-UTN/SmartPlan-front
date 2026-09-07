import type {
  PlanRecommendationsResponse,
  RecommendationsQuery,
} from '@/types';
import { apiClient } from './client';

/**
 * Fetches the signed-in user's recommended plans for the Home (CU20).
 * Backend contract: `GET /plan-recommendations`. Requires a session (401
 * otherwise). Returns `{ data, pagination, meta }`; `data` is `[]` — never an
 * error — when there is nothing to recommend.
 */
export async function getRecommendations(
  query: RecommendationsQuery = {}
): Promise<PlanRecommendationsResponse> {
  return apiClient.get<PlanRecommendationsResponse>('/plan-recommendations', {
    params: query,
  });
}

/**
 * Stops recommending a plan to the caller (CU21).
 * `POST /plan-recommendations/:planId/dismiss` → 204, idempotent. Fails with
 * `PLAN_NOT_FOUND` (404) or `CANNOT_DISMISS_OWN_PLAN` (403).
 */
export async function dismissRecommendation(planId: number): Promise<void> {
  await apiClient.post<void>(`/plan-recommendations/${planId}/dismiss`);
}

/**
 * Undoes a dismissal — the short "Deshacer" window (CU21).
 * `DELETE /plan-recommendations/:planId/dismiss` → 204, idempotent.
 */
export async function undoDismissRecommendation(planId: number): Promise<void> {
  await apiClient.delete<void>(`/plan-recommendations/${planId}/dismiss`);
}
