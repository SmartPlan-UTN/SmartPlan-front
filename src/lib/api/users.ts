import type {
  UserProfile,
  UpdateUserPreferencesInput,
  UserPreferencesResponse,
} from '@/types';
import { apiClient } from './client';

export interface UpdateProfileData {
  name: string;
  lastName: string;
}

export async function getProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/users/me');
}

export async function updateProfile(
  data: UpdateProfileData,
): Promise<UserProfile> {
  return apiClient.patch<UserProfile>('/users/me', data);
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(data: ChangePasswordData): Promise<void> {
  await apiClient.patch<void>('/users/me/password', data);
}

export interface DeleteAccountData {
  currentPassword: string;
}

export async function deleteAccount(data: DeleteAccountData): Promise<void> {
  await apiClient.delete<void>('/users/me', { data });
}

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
