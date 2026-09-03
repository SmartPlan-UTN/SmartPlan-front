import type {
  LocationOption,
  PaginatedResult,
  PlaceListParams,
  PlaceOption,
  ResolvedPlace,
} from '@/types';
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

/**
 * Resolves a free-text location to a real place (CU8/CU18, PAN 15 preferred
 * area — also reused wherever a typed location must be confirmed).
 *
 * Backend contract: `GET /api/external-integration/places/search?query=…`.
 * Public, cached 24 h, and rate limited (20/min per client) — call it on an
 * explicit user action (confirm / submit), not on every keystroke. Throws
 * `404 PLACE_NOT_FOUND` when Google returns no match, `429`
 * `EXTERNAL_PROVIDER_RATE_LIMITED` when the quota is hit.
 */
export async function searchPlace(query: string): Promise<ResolvedPlace> {
  return apiClient.get<ResolvedPlace>('/external-integration/places/search', {
    params: { query },
  });
}
