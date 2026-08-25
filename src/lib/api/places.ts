import type { PaginatedResult } from '@/types';
import { apiClient } from './client';

export interface PlaceSummary {
  id: number;
  name: string;
  address: string;
  department: {
    name: string;
    city: {
      name: string;
      country: {
        name: string;
      };
    };
  };
}

/**
 * Searches for places registered in the system (CU24).
 * Backend contract: `GET /places`.
 */
export async function searchPlaces(search: string): Promise<PaginatedResult<PlaceSummary>> {
  return apiClient.get<PaginatedResult<PlaceSummary>>('/places', {
    params: { search, limit: 10 },
  });
}
