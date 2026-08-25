import type {
  ListOwnPlansParams,
  PaginatedResult,
  PlanDetailResult,
  PlanSearchParams,
  PlanSearchResult,
  CreatePlanDto,
  UpdatePlanDto,
  OwnPlanDetail,
  OwnPlanSummary,
  Plan,
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
 * Creates a new plan for the logged-in user (CU24).
 * Backend contract: `POST /users/me/plans`.
 */
export async function createPlan(dto: CreatePlanDto): Promise<Plan> {
  return apiClient.post<Plan>('/users/me/plans', dto);
}

/**
 * Lists the plans owned by the logged-in user (CU29).
 * Backend contract: `GET /users/me/plans`.
 */
export async function listOwnPlans(
  params: ListOwnPlansParams = {}
): Promise<PaginatedResult<OwnPlanSummary>> {
  return apiClient.get<PaginatedResult<OwnPlanSummary>>('/users/me/plans', {
    params,
  });
}

/**
 * Fetches the details of an owned plan (CU25, CU29).
 * Backend contract: `GET /users/me/plans/:id`.
 */
export async function getOwnPlan(id: number): Promise<OwnPlanDetail> {
  return apiClient.get<OwnPlanDetail>(`/users/me/plans/${id}`);
}

/**
 * Updates basic details of an owned plan (CU25).
 * Backend contract: `PATCH /users/me/plans/:id`.
 */
export async function updateOwnPlan(
  id: number,
  dto: UpdatePlanDto
): Promise<OwnPlanDetail> {
  return apiClient.patch<OwnPlanDetail>(`/users/me/plans/${id}`, dto);
}

/**
 * Cancels an owned plan (CU26).
 * Backend contract: `DELETE /users/me/plans/:id`.
 */
export async function cancelOwnPlan(id: number): Promise<void> {
  return apiClient.delete<void>(`/users/me/plans/${id}`);
}

/**
 * Adds an activity stop to a plan (CU24/CU27).
 * Backend contract: `POST /users/me/plans/:id/details`.
 */
export async function addPlanActivity(
  planId: number,
  activityId: number
): Promise<OwnPlanDetail> {
  return apiClient.post<OwnPlanDetail>(`/users/me/plans/${planId}/details`, {
    activityId,
  });
}

/**
 * Removes an activity stop from an owned plan (CU28).
 * Backend contract: `DELETE /users/me/plans/:id/details/:detailId`.
 */
export async function removePlanActivity(
  planId: number,
  detailId: number
): Promise<void> {
  return apiClient.delete<void>(`/users/me/plans/${planId}/details/${detailId}`);
}
