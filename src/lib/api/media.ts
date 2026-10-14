import type {
  AvatarImage,
  ImageAttribution,
  MediaImage,
  MediaTarget,
  PhotoAuthor,
} from '@/types';
import { apiClient } from './client';
import { getApiBaseUrl } from './config';

const UPLOAD_RESOURCES: Record<MediaTarget, string> = {
  activity: 'activities',
  place: 'places',
  plan: 'plans',
  rating: 'ratings',
  feedback: 'feedback',
};

/** A Google Places photo the API streams for one activity place (SmartPlan-back#102). */
const PLACE_PHOTO_PATH = /^\/api\/activity-places\/\d+\/photo$/;

/**
 * API responses include /api; the configured base URL already ends there.
 * Only SmartPlan images are accepted: uploaded media and place photos.
 */
export function mediaRequestPath(url: string): string {
  const base = new URL(getApiBaseUrl());
  const value = new URL(url, base.origin);
  const isImage =
    value.pathname.startsWith('/api/media/') || PLACE_PHOTO_PATH.test(value.pathname);
  if (value.origin !== base.origin || !isImage) {
    throw new Error('Invalid SmartPlan media URL');
  }
  return `${value.pathname.slice('/api'.length)}${value.search}`;
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

export interface MediaDownload {
  blob: Blob;
  /** Set for a provider photo, which must be credited wherever it shows. */
  attribution: ImageAttribution | null;
}

/** Reads the credit the API sends with a Google Places photo, if any. */
export function readImageAttribution(
  provider: unknown,
  encodedAuthors: unknown,
): ImageAttribution | null {
  if (provider !== 'google_maps') return null;
  let authors: PhotoAuthor[] = [];
  if (typeof encodedAuthors === 'string' && encodedAuthors) {
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(encodedAuthors));
      if (Array.isArray(parsed)) {
        authors = parsed
          .filter(
            (author): author is { displayName: string; uri?: unknown } =>
              typeof author === 'object' &&
              author !== null &&
              typeof (author as { displayName?: unknown }).displayName === 'string',
          )
          .map((author) => ({
            displayName: author.displayName,
            uri: typeof author.uri === 'string' && /^https:\/\//.test(author.uri) ? author.uri : null,
          }));
      }
    } catch {
      // A malformed header still leaves the mandatory "Google Maps" credit.
    }
  }
  return { provider: 'google_maps', authors };
}

export async function downloadMedia(url: string): Promise<MediaDownload> {
  const response = await apiClient.request<Blob>({
    method: 'GET',
    url: mediaRequestPath(url),
    responseType: 'blob',
  });
  return {
    blob: response.data,
    attribution: readImageAttribution(
      response.headers['x-photo-provider'],
      response.headers['x-photo-attributions'],
    ),
  };
}
