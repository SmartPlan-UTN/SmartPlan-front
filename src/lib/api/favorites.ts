import type {
  ExplorationQueryParams,
  FavoriteActivity,
  FavoritePlan,
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

/**
 * Saves a plan to the user's favorites list (CU43).
 * Backend contract: `POST /favorite-plans`.
 */
export async function saveFavoritePlan(
  idPlan: number,
): Promise<FavoritePlan> {
  return apiClient.post<FavoritePlan>('/favorite-plans', {
    idPlan,
  });
}

/**
 * Removes a plan from the user's favorites list (CU42).
 * Backend contract: `DELETE /favorite-plans/:idPlan`.
 */
export async function removeFavoritePlan(
  idPlan: number,
): Promise<void> {
  return apiClient.delete<void>(`/favorite-plans/${idPlan}`);
}

/**
 * Lists the user's saved favorite plans (CU40).
 * Backend contract: `GET /favorite-plans`.
 */
export async function listFavoritePlans(
  params?: ExplorationQueryParams,
): Promise<PaginatedResult<FavoritePlan>> {
  return apiClient.get<PaginatedResult<FavoritePlan>>(
    '/favorite-plans',
    { params },
  );
}
