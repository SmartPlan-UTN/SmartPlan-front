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
  // The API accepts at most 6 decimal places (~0.1 m); a Maps viewport reports
  // 14+, which the contract rejects as a validation error.
  const round6 = (value: number) => Math.round(value * 1e6) / 1e6;
  return apiClient.get<PaginatedResult<ActivityMapMarker>>('/activities/map', {
    params: {
      ...params,
      north: round6(params.north),
      south: round6(params.south),
      east: round6(params.east),
      west: round6(params.west),
      ...(params.latitude !== undefined
        ? { latitude: round6(params.latitude) }
        : {}),
      ...(params.longitude !== undefined
        ? { longitude: round6(params.longitude) }
        : {}),
    },
    signal: options.signal,
  });
}
