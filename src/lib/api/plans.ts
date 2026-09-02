import type {
  AddPlanDetailDto,
  CreatePlanDto,
  Plan,
  PlanSuggestionDto,
  UpdatePlanDto,
  ListOwnPlansParams,
  OwnPlanDetail,
  OwnPlanSummary,
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
 * The signed-in user's own plans, newest first (CU23 · PAN 13).
 * Backend contract: `GET /users/me/plans`, paginated. Carries the CU23
 * feedback layer (`feedbackState`, `feedback`, `completedAt`).
 */
export async function listOwnPlans(
  params: ListOwnPlansParams = {},
): Promise<PaginatedResult<OwnPlanSummary>> {
  return apiClient.get<PaginatedResult<OwnPlanSummary>>('/users/me/plans', {
    params: { direction: 'desc', ...params },
  });
}

/**
 * One of the user's own plans with its itinerary (CU23 · PAN 17 feedback
 * section). `GET /users/me/plans/:id`. Rejects with `ApiError` 403/404 when
 * the caller is not the owner.
 */
export async function getOwnPlan(id: number): Promise<OwnPlanDetail> {
  return apiClient.get<OwnPlanDetail>(`/users/me/plans/${id}`);
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

export async function createPlan(dto: CreatePlanDto): Promise<OwnPlanDetail> {
  return apiClient.post<OwnPlanDetail>('/users/me/plans', dto);
}

export async function updateOwnPlan(
  id: number,
  dto: UpdatePlanDto,
): Promise<OwnPlanDetail> {
  return apiClient.patch<OwnPlanDetail>(`/users/me/plans/${id}`, dto);
}

export async function cancelOwnPlan(id: number): Promise<void> {
  return apiClient.delete<void>(`/users/me/plans/${id}`);
}

export async function addPlanActivity(
  planId: number,
  dto: AddPlanDetailDto,
): Promise<OwnPlanDetail> {
  return apiClient.post<OwnPlanDetail>(`/users/me/plans/${planId}/details`, dto);
}

export async function removePlanActivity(
  planId: number,
  detailId: number,
): Promise<void> {
  return apiClient.delete<void>(`/users/me/plans/${planId}/details/${detailId}`);
}

export async function generateSuggestedPlan(
  dto: PlanSuggestionDto,
): Promise<Plan> {
  return apiClient.post<Plan>('/plan-suggestions', dto);
}
