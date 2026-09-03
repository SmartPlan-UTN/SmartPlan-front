import type { AuthenticationResponse } from '@/lib/auth/api';
import type { UserProfile } from '@/types';
import { apiClient } from './client';

export interface UpdateProfileData {
  name: string;
  lastName: string;
}

/**
 * Loads the signed-in user's editable profile (CU5).
 * Backend contract: `GET /users/me`.
 */
export async function getProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/users/me');
}

/**
 * Saves the signed-in user's name and last name (CU5). Email is read-only:
 * it's the login credential and this endpoint doesn't accept changing it;
 * role and status are informational and aren't sent either.
 * Backend contract: `PATCH /users/me`.
 */
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

/**
 * Permanently deletes the signed-in user's account (CU7): soft-removes the
 * row, revokes every session and pending recovery token, and clears the
 * refresh cookie server-side. 204 with no body on success. The caller is
 * responsible for closing the local session afterward (see
 * `DeleteAccountDialog`, which calls `useSession().logout()`), the same way
 * CU6's `changePassword` does.
 * Backend contract: `DELETE /users/me`.
 */
export async function deleteAccount(data: DeleteAccountData): Promise<void> {
  await apiClient.delete<void>('/users/me', { data });
}
