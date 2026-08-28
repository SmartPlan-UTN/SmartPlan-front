import type {
  ExplorationQueryParams,
  FavoriteActivity,
  PaginatedResult,
} from '@/types';
import { apiClient } from './client';

/**
 * Saves an activity to the user's favorites list (CU15).
 * Backend contract: `POST /favorite-activities`.
 */
export async function saveFavoriteActivity(
  idActivity: number,
): Promise<FavoriteActivity> {
  return apiClient.post<FavoriteActivity>('/favorite-activities', {
    idActivity,
  });
}

/**
 * Removes an activity from the user's favorites list (CU41).
 * Backend contract: `DELETE /favorite-activities/:idActivity`.
 */
export async function removeFavoriteActivity(
  idActivity: number,
): Promise<void> {
  return apiClient.delete<void>(`/favorite-activities/${idActivity}`);
}

/**
 * Lists the user's saved favorite activities (CU39).
 * Backend contract: `GET /favorite-activities`.
 */
export async function listFavoriteActivities(
  params?: ExplorationQueryParams,
): Promise<PaginatedResult<FavoriteActivity>> {
  return apiClient.get<PaginatedResult<FavoriteActivity>>(
    '/favorite-activities',
    { params },
  );
}
