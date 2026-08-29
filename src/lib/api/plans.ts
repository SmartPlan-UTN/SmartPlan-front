import type {
  PaginatedResult,
  PlanDetailResult,
  PlanSearchParams,
  PlanSearchResult,
  PlanSelectionResult,
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

/**
 * Marks the user's intent to do a generated plan — `generated → selected`
 * (CU22). Backend contract: `PATCH /plans/:id/select`, no body — see
 * `docs/plan-selection-api.md` in `SmartPlan-back`. Errors surface as
 * `ApiError` with codes `ACCESS_DENIED` (403), `PLAN_NOT_FOUND` (404), or
 * `PLAN_REQUEST_ALREADY_ADVANCED` (409).
 */
export async function selectPlan(id: number): Promise<PlanSelectionResult> {
  return apiClient.patch<PlanSelectionResult>(`/plans/${id}/select`);
}

/**
 * Withdraws that intent — `selected → generated` (CU22), without picking
 * another alternative. `DELETE /plans/:id/select`, no body. Idempotent: a plan
 * that is already `generated` resolves `200` with no change.
 */
export async function deselectPlan(id: number): Promise<PlanSelectionResult> {
  return apiClient.delete<PlanSelectionResult>(`/plans/${id}/select`);
}
