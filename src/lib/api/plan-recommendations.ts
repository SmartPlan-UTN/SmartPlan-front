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
