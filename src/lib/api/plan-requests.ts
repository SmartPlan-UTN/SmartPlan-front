import type {
  PaginatedResult,
  PlanRequestSummary,
  CreatePlanRequestPayload,
  CreateSurprisePlanRequestPayload,
  PlanRequestAccepted,
  PlanRequestStatus,
  RefinePlanRequestPayload,
} from '@/types';
import { apiClient } from './client';

// Creating a request persists it and publishes a job before returning 202.
// Give the API's 30 s preparation deadline enough time to return the accepted
// request ID so the UI can start polling instead of showing a false timeout.
const PLAN_REQUEST_SUBMISSION_TIMEOUT_MS = 40_000;

/**
 * Submits a natural-language plan request (CU17).
 * Backend contract: `POST /plan-requests`, 202 Accepted. Async: the
 * request starts `pending` and must be polled via `getPlanRequestStatus`.
 */
export async function createPlanRequest(
  payload: CreatePlanRequestPayload
): Promise<PlanRequestAccepted> {
  return apiClient.post<PlanRequestAccepted>('/plan-requests', payload, {
    timeout: PLAN_REQUEST_SUBMISSION_TIMEOUT_MS,
  });
}

/**
 * Submits a surprise plan request from the user's coordinates (CU19).
 * Backend contract: `POST /plan-requests/surprise`, 202 Accepted. Throws
 * `409 NO_LOCATION_AVAILABLE` if no department resolves near the given
 * coordinates. Polled the same way as `createPlanRequest`.
 */
export async function createSurprisePlanRequest(
  payload: CreateSurprisePlanRequestPayload
): Promise<PlanRequestAccepted> {
  return apiClient.post<PlanRequestAccepted>('/plan-requests/surprise', payload, {
    timeout: PLAN_REQUEST_SUBMISSION_TIMEOUT_MS,
  });
}

/**
 * Fetches the current status of a plan request (CU17, CU19).
 * Backend contract: `GET /plan-requests/:id`. `plans` is only populated
 * once `statusKey === 'generated'`.
 */
export async function getPlanRequestStatus(id: number): Promise<PlanRequestStatus> {
  return apiClient.get<PlanRequestStatus>(`/plan-requests/${id}`);
}

export async function refinePlanRequest(id: number, payload: RefinePlanRequestPayload): Promise<PlanRequestAccepted> {
  return apiClient.post<PlanRequestAccepted>(`/plan-requests/${id}/refine`, payload, {
    timeout: PLAN_REQUEST_SUBMISSION_TIMEOUT_MS,
  });
}

/**
 * Lists the caller's own generated and in-flight requests, newest first
 * (#189), so a past result can be reopened instead of generated again.
 * Backend contract: `GET /plan-requests`.
 */
export async function listPlanRequests(
  params?: { page?: number; limit?: number },
): Promise<PaginatedResult<PlanRequestSummary>> {
  return apiClient.get<PaginatedResult<PlanRequestSummary>>('/plan-requests', {
    params,
  });
}
