import type { UpdatePreferencesData, UserPreferences } from '@/types';
import { apiClient } from './client';

/**
 * Loads the signed-in user's recommendation preferences (CU8/CU18):
 * interest categories plus the scalar profile (budget, party size,
 * preferred area, max distance). Backend contract: `GET
 * /users/me/preferences`.
 */
export async function getPreferences(): Promise<UserPreferences> {
  return apiClient.get<UserPreferences>('/users/me/preferences');
}

/**
 * Saves the signed-in user's preferences. `categoryIds` is the full
 * replacement set; every other field is optional and independently
 * clearable with an explicit `null` (see `UpdatePreferencesData`). Backend
 * contract: `PATCH /users/me/preferences`.
 */
export async function updatePreferences(
  data: UpdatePreferencesData,
): Promise<UserPreferences> {
  return apiClient.patch<UserPreferences>('/users/me/preferences', data);
}
