import type { UserProfile } from '@/types';
import { apiClient } from './client';

export interface UpdateProfileData {
  name: string;
  lastName: string;
  /** `undefined` leaves the stored phone untouched; `null` clears it. */
  phone?: string | null;
}

/**
 * Loads the signed-in user's editable profile (CU5).
 * Backend contract: `GET /users/me`.
 */
export async function getProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/users/me');
}

/**
 * Saves the signed-in user's name, last name, and phone (CU5). Email is
 * read-only: it's the login credential and this endpoint doesn't accept
 * changing it; role and status are informational and aren't sent either.
 * Backend contract: `PATCH /users/me`.
 */
export async function updateProfile(
  data: UpdateProfileData
): Promise<UserProfile> {
  return apiClient.patch<UserProfile>('/users/me', data);
}
