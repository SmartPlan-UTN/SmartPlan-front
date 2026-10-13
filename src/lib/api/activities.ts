import type {
  ActivityDetailResult,
  ActivityMapMarker,
  ActivitySearchParams,
  ActivitySearchResult,
  MapActivitiesParams,
  PaginatedResult,
} from '@/types';
import { apiClient } from './client';

/**
 * Searches, filters, sorts, and paginates activities (CU9-CU11).
 * Backend contract: `GET /activities`, see `docs/exploration-api.md` in
 * `SmartPlan-back`.
 */
export async function searchActivities(
  params: ActivitySearchParams,
  options: { signal?: AbortSignal } = {}
): Promise<PaginatedResult<ActivitySearchResult>> {
  return apiClient.get<PaginatedResult<ActivitySearchResult>>('/activities', {
    params,
    signal: options.signal,
  });
}

/**
 * Fetches an activity's detail, including its meeting points (CU14).
 * Backend contract: `GET /activities/:id`.
 */
export async function getActivity(id: number): Promise<ActivityDetailResult> {
  return apiClient.get<ActivityDetailResult>(`/activities/${id}`);
}

/**
 * Fetches activity markers within a map viewport (CU16).
 * Backend contract: `GET /activities/map`.
 */
export async function getActivityMapMarkers(
  params: MapActivitiesParams,
  options: { signal?: AbortSignal } = {}
): Promise<PaginatedResult<ActivityMapMarker>> {
  return apiClient.get<PaginatedResult<ActivityMapMarker>>('/activities/map', {
    params,
    signal: options.signal,
  });
}
