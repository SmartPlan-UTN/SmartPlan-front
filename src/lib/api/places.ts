import type { PaginatedResult, PlaceListParams, PlaceOption } from '@/types';

import { apiClient } from './client';

/** Lists registered places that can be associated with an activity. */
export async function listPlaces(
  params: PlaceListParams = {},
): Promise<PaginatedResult<PlaceOption>> {
  return apiClient.get<PaginatedResult<PlaceOption>>('/places', { params });
}
