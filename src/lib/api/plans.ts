import type {
  PaginatedResult,
  PlanDetailResult,
  PlanSearchParams,
  PlanSearchResult,
  CreatePlanDto,
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
 * Adds an activity stop to a plan (CU24/CU27).
 * Backend contract: `POST /users/me/plans/:id/details`.
 */
export async function addPlanActivity(planId: number, activityId: number): Promise<Plan> {
  return apiClient.post<Plan>(`/users/me/plans/${planId}/details`, { activityId });
}
