import type { LocationOption, PaginatedResult, PlaceListParams, PlaceOption } from '@/types';
import { apiClient } from './client';

/**
 * "Provincia" filter options (CU10). One page is enough for a `Select` —
 * there's no pagination UI for this list, just a generous `limit`.
 * Backend contract: `GET /places/cities`.
 */
export async function listCities(): Promise<PaginatedResult<LocationOption>> {
  return apiClient.get<PaginatedResult<LocationOption>>('/places/cities', {
    params: { limit: 100 },
  });
}

/**
 * "Localidad" filter options, scoped to a "Provincia" (CU10).
 * Backend contract: `GET /places/departments?cityId=`.
 */
export async function listDepartments(
  cityId: number
): Promise<PaginatedResult<LocationOption>> {
  return apiClient.get<PaginatedResult<LocationOption>>('/places/departments', {
    params: { cityId, limit: 100 },
  });
}

/** Lists registered places that can be associated with an activity. */
export async function listPlaces(
  params: PlaceListParams = {},
): Promise<PaginatedResult<PlaceOption>> {
  return apiClient.get<PaginatedResult<PlaceOption>>('/places', { params });
}
