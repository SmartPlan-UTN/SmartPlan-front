import type {
  ListOutingsParams,
  OutingCreationResult,
  OutingDetail,
  OutingSummary,
  PaginatedResult,
} from '@/types';
import { apiClient } from './client';

/**
 * "Lo voy a hacer" (CU22): copies the plan into a new outing of the caller.
 * Idempotent while that outing is still to do — a repeat returns it with
 * `created: false`. Backend contract: `POST /users/me/outings`.
 */
export async function createOuting(
  sourcePlanId: number
): Promise<OutingCreationResult> {
  return apiClient.post<OutingCreationResult>('/users/me/outings', {
    sourcePlanId,
  });
}

/** "Mis salidas". Backend contract: `GET /users/me/outings`. */
export async function listOutings(
  params: ListOutingsParams = {}
): Promise<PaginatedResult<OutingSummary>> {
  return apiClient.get<PaginatedResult<OutingSummary>>('/users/me/outings', {
    params,
  });
}

/** Backend contract: `GET /users/me/outings/:id`. */
export async function getOuting(id: number): Promise<OutingDetail> {
  return apiClient.get<OutingDetail>(`/users/me/outings/${id}`);
}

/**
 * "Marcar como realizada": opens the feedback at once (CU23). Idempotent.
 * Backend contract: `PATCH /users/me/outings/:id/complete`.
 */
export async function completeOuting(id: number): Promise<OutingDetail> {
  return apiClient.patch<OutingDetail>(`/users/me/outings/${id}/complete`);
}

/**
 * "Volver a hacer este plan": a new outing to do; earlier ones and their
 * feedback stay. Backend contract: `POST /users/me/outings/:id/repeat`.
 */
export async function repeatOuting(id: number): Promise<OutingCreationResult> {
  return apiClient.post<OutingCreationResult>(`/users/me/outings/${id}/repeat`);
}

/**
 * Cancels an outing still to do (`409 OUTING_ALREADY_COMPLETED` otherwise).
 * Backend contract: `DELETE /users/me/outings/:id`.
 */
export async function cancelOuting(id: number): Promise<void> {
  return apiClient.delete<void>(`/users/me/outings/${id}`);
}
