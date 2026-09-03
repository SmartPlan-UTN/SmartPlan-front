import type {
  CreatePlanRequestPayload,
  CreateSurprisePlanRequestPayload,
  PlanRequestAccepted,
  PlanRequestStatus,
} from '@/types';
import { apiClient } from './client';

/**
 * Submits a natural-language plan request (CU17).
 * Backend contract: `POST /plan-requests`, 202 Accepted. Async: the
 * request starts `pending` and must be polled via `getPlanRequestStatus`.
 */
export async function createPlanRequest(
  payload: CreatePlanRequestPayload
): Promise<PlanRequestAccepted> {
  return apiClient.post<PlanRequestAccepted>('/plan-requests', payload);
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
  return apiClient.post<PlanRequestAccepted>('/plan-requests/surprise', payload);
}

/**
 * Fetches the current status of a plan request (CU17, CU19).
 * Backend contract: `GET /plan-requests/:id`. `plans` is only populated
 * once `statusKey === 'generated'`.
 */
export async function getPlanRequestStatus(id: number): Promise<PlanRequestStatus> {
  return apiClient.get<PlanRequestStatus>(`/plan-requests/${id}`);
}
