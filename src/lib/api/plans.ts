import type {
  PaginatedResult,
  PlanDetailResult,
  PlanSearchParams,
  PlanSearchResult,
} from '@/types';
import { apiClient } from './client';

/**
 * Searches, filters, sorts, and paginates plans (CU12).
 * Backend contract: `GET /plans`, see `docs/exploration-api.md` in
 * `SmartPlan-back`.
 */
export async function searchPlans(
  params: PlanSearchParams
): Promise<PaginatedResult<PlanSearchResult>> {
  return apiClient.get<PaginatedResult<PlanSearchResult>>('/plans', {
    params,
  });
}

/**
 * Fetches a plan's detail, including its ordered itinerary (CU13).
 * Backend contract: `GET /plans/:id`.
 */
export async function getPlan(id: number): Promise<PlanDetailResult> {
  return apiClient.get<PlanDetailResult>(`/plans/${id}`);
}
