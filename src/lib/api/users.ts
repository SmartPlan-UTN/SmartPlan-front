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

export async function changePassword(data: ChangePasswordData): Promise<void> {
  await apiClient.patch<void>('/users/me/password', data);
}

export interface DeleteAccountData {
  currentPassword: string;
}

export async function deleteAccount(data: DeleteAccountData): Promise<void> {
  await apiClient.delete<void>('/users/me', { data });
}
