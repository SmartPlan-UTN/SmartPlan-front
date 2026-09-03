import type { AuthenticationResponse } from '@/lib/auth/api';
import type {
  UpdateUserPreferencesInput,
  UserPreferencesResponse,
  UserProfile,
} from '@/types';
import { apiClient } from './client';

export async function getPreferences(): Promise<UserPreferencesResponse> {
  return apiClient.get<UserPreferencesResponse>('/users/me/preferences');
}

export async function updatePreferences(
  input: UpdateUserPreferencesInput
): Promise<UserPreferencesResponse> {
  return apiClient.patch<UserPreferencesResponse>('/users/me/preferences', input);
}

export interface UpdateProfileData {
  name: string;
  lastName: string;
}

export async function getProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/users/me');
}

export async function updateProfile(
  data: UpdateProfileData
): Promise<UserProfile> {
  return apiClient.patch<UserProfile>('/users/me', data);
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Changes the signed-in user's password (CU6). The backend revokes every
 * *other* active session and every pending password-recovery token as part
 * of the same transaction, but keeps this one alive: the response is a
 * fresh `AuthenticationResponse` (new access token, new refresh cookie)
 * for the session making the request, same shape as login/refresh, so the
 * caller can stay authenticated instead of being signed out — see
 * `ChangePasswordForm`, which feeds this straight into `useSession()`.
 * Backend contract: `PATCH /users/me/password`.
 */
export async function changePassword(
  data: ChangePasswordData
): Promise<AuthenticationResponse> {
  return apiClient.patch<AuthenticationResponse>('/users/me/password', data);
}

export interface DeleteAccountData {
  currentPassword: string;
}

export async function deleteAccount(data: DeleteAccountData): Promise<void> {
  await apiClient.delete<void>('/users/me', { data });
}
