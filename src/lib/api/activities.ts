import type {
  ActivitySearchParams,
  ActivitySearchResult,
  PaginatedResult,
} from '@/types';
import { apiClient } from './client';

/**
 * Searches, filters, sorts, and paginates activities (CU9-CU11).
 * Backend contract: `GET /activities`, see `docs/exploration-api.md` in
 * `SmartPlan-back`.
 */
export async function searchActivities(
  params: ActivitySearchParams
): Promise<PaginatedResult<ActivitySearchResult>> {
  return apiClient.get<PaginatedResult<ActivitySearchResult>>('/activities', {
    params,
  });
}
