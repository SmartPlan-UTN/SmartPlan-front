import type {
  UpdateUserPreferencesInput,
  UserPreferencesResponse,
} from '@/types';
import { apiClient } from './client';

/**
 * Loads the signed-in user's preferred categories (CU8, CU18).
 * Backend contract: `GET /users/me/preferences`.
 */
export async function getPreferences(): Promise<UserPreferencesResponse> {
  return apiClient.get<UserPreferencesResponse>('/users/me/preferences');
}

/**
 * Replaces the signed-in user's recommendation profile (CU8, CU18). Categories
 * are a full replacement, not a diff; an empty array is valid. Nullable budget
 * and area fields can be cleared independently. Rejects with
 * `422 CATEGORY_NOT_AVAILABLE` if any requested category is no longer
 * active.
 * Backend contract: `PATCH /users/me/preferences`.
 */
export async function updatePreferences(
  input: UpdateUserPreferencesInput
): Promise<UserPreferencesResponse> {
  return apiClient.patch<UserPreferencesResponse>('/users/me/preferences', input);
}
