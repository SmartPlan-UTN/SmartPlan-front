import type {
  PaginatedResult,
  PlaceListParams,
  PlaceOption,
  ResolvedPlace,
} from '@/types';
import { apiClient } from './client';

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
