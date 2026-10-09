import type {
  ListOwnPlansParams,
  PaginatedResult,
  PlanDetailResult,
  PlanSearchParams,
  PlanSearchResult,
  CreatePlanDto,
  CreatePlanComposerDto,
  UpdatePlanDto,
  UpdatePlanComposerDto,
  OwnPlanDetail,
  OwnPlanSummary,
  PlanVisibility,
  ActivitySuggestion,
  ActivitySuggestionsParams,
  AssistantImproveResponse,
  AssistantSearchResponse,
  AssistantSuggestResponse,
} from "@/types";
import { apiClient } from "./client";

/**
 * Searches, filters, sorts, and paginates plans (CU12).
 * Backend contract: `GET /plans`, see `docs/exploration-api.md` in
 * `SmartPlan-back`.
 */
export async function searchPlans(
  params: PlanSearchParams,
): Promise<PaginatedResult<PlanSearchResult>> {
  return apiClient.get<PaginatedResult<PlanSearchResult>>("/plans", {
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
export async function createPlan(dto: CreatePlanDto): Promise<OwnPlanDetail> {
  return apiClient.post<OwnPlanDetail>("/users/me/plans", dto);
}

/** Atomically creates a plan and its ordered itinerary from the composer. */
export async function createPlanFromComposer(
  dto: CreatePlanComposerDto,
): Promise<OwnPlanDetail> {
  return apiClient.post<OwnPlanDetail>("/users/me/plans/composer", dto);
}

/**
 * Lists the plans owned by the logged-in user (CU29).
 * Backend contract: `GET /users/me/plans`.
 */
export async function listOwnPlans(
  params: ListOwnPlansParams = {},
): Promise<PaginatedResult<OwnPlanSummary>> {
  return apiClient.get<PaginatedResult<OwnPlanSummary>>("/users/me/plans", {
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
  dto: UpdatePlanDto,
): Promise<OwnPlanDetail> {
  return apiClient.patch<OwnPlanDetail>(`/users/me/plans/${id}`, dto);
}

/** Publishes an authored plan or makes it private again (#98). */
export async function setOwnPlanVisibility(
  id: number,
  visibility: PlanVisibility,
): Promise<OwnPlanDetail> {
  return apiClient.patch<OwnPlanDetail>(`/users/me/plans/${id}/visibility`, {
    visibility,
  });
}

/** Recommends catalog activities for an authored plan (#98). */
export async function suggestActivities({
  title,
  description,
  excludeActivityIds = [],
}: ActivitySuggestionsParams): Promise<{ data: ActivitySuggestion[] }> {
  return apiClient.get<{ data: ActivitySuggestion[] }>("/activity-suggestions", {
    params: {
      title,
      ...(description ? { description } : {}),
      ...(excludeActivityIds.length > 0
        ? { excludeActivityIds: excludeActivityIds.join(",") }
        : {}),
    },
  });
}

/**
 * Natural-language search over the real catalog ("algo para comer cerca del
 * museo, barato y tranquilo"). Answers 503 `ASSISTANT_UNAVAILABLE` when the
 * model is slow or down: callers fall back to the regular search.
 */
export async function assistantSearch(
  params: { query: string; stopActivityIds: number[] },
  options: { signal?: AbortSignal } = {},
): Promise<AssistantSearchResponse> {
  return apiClient.post<AssistantSearchResponse>(
    "/users/me/plans/assistant/search",
    params,
    { signal: options.signal },
  );
}

/** Activities that complement the route, and the kind it lacks, if any. */
export async function assistantSuggest(
  params: { title: string; description?: string; stopActivityIds: number[] },
  options: { signal?: AbortSignal } = {},
): Promise<AssistantSuggestResponse> {
  return apiClient.post<AssistantSuggestResponse>(
    "/users/me/plans/assistant/suggest",
    params,
    { signal: options.signal },
  );
}

/** At most three proposed improvements to an ordered route. */
export async function assistantImprove(
  params: { title: string; stopActivityIds: number[] },
  options: { signal?: AbortSignal } = {},
): Promise<AssistantImproveResponse> {
  return apiClient.post<AssistantImproveResponse>(
    "/users/me/plans/assistant/improve",
    params,
    { signal: options.signal },
  );
}

/** Atomically updates plan metadata, visibility, and ordered stops. */
export async function updatePlanFromComposer(
  id: number,
  dto: UpdatePlanComposerDto,
): Promise<OwnPlanDetail> {
  return apiClient.put<OwnPlanDetail>(`/users/me/plans/${id}/composer`, dto);
}

/**
 * Deletes an owned plan (CU26).
 *
 * A logical delete: the row survives with the `cancelled` status so ratings,
 * favourites, and the audit trail keep their foreign keys. It is a delete
 * from everyone else's point of view — `GET /plans/:id` answers 404 and
 * `GET /plans` filters it out — but `GET /users/me/plans` still returns it,
 * so the owner's listing is what hides it.
 *
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
  activityId: number,
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
  detailId: number,
): Promise<void> {
  return apiClient.delete<void>(
    `/users/me/plans/${planId}/details/${detailId}`,
  );
}
