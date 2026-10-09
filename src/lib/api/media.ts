import type { AvatarImage, MediaImage, MediaTarget } from '@/types';
import { apiClient } from './client';
import { getApiBaseUrl } from './config';

const UPLOAD_RESOURCES: Record<MediaTarget, string> = {
  activity: 'activities',
  place: 'places',
  plan: 'plans',
  rating: 'ratings',
  feedback: 'feedback',
};

/** API responses include /api; the configured base URL already ends there. */
export function mediaRequestPath(url: string): string {
  const base = new URL(getApiBaseUrl());
  const value = new URL(url, base.origin);
  if (value.origin !== base.origin || !value.pathname.startsWith('/api/media/')) {
    throw new Error('Invalid SmartPlan media URL');
  }
  return value.pathname.slice('/api'.length);
}

export function listMedia(target: MediaTarget, resourceId: number): Promise<MediaImage[]> {
  return apiClient.get<MediaImage[]>(`/media/${target}/${resourceId}/images`);
}

export function uploadMedia(
  target: MediaTarget,
  resourceId: number,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<MediaImage> {
  const form = new FormData();
  form.append('file', file);
  const resource = UPLOAD_RESOURCES[target];
  return apiClient.post<MediaImage>(`/${resource}/${resourceId}/images`, form, {
    headers: { 'Content-Type': undefined },
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });
}

export function updateMedia(
  target: MediaTarget,
  resourceId: number,
  imageId: number,
  changes: { isPrimary?: boolean; displayOrder?: number },
): Promise<MediaImage> {
  return apiClient.patch<MediaImage>(`/${target}/${resourceId}/images/${imageId}`, changes);
}

export async function deleteMedia(
  target: MediaTarget,
  resourceId: number,
  imageId: number,
): Promise<void> {
  await apiClient.delete<void>(`/${target}/${resourceId}/images/${imageId}`);
}

export function uploadAvatar(file: File): Promise<AvatarImage> {
  const form = new FormData();
  form.append('file', file);
  return apiClient.put<AvatarImage>('/users/me/avatar', form, {
    headers: { 'Content-Type': undefined },
  });
}

export async function deleteAvatar(): Promise<void> {
  await apiClient.delete<void>('/users/me/avatar');
}

export function downloadMedia(url: string): Promise<Blob> {
  return apiClient.get<Blob>(mediaRequestPath(url), { responseType: 'blob' });
}
