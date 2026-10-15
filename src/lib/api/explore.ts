import type {
  ExploreItem,
  ExploreMapMarker,
  ExploreMapParams,
  ExploreSearchParams,
  PaginatedResult,
  PlaceDetailResult,
  PlacePhotoMedia,
} from '@/types';
import { apiClient } from './client';

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;
const inFlightPhotos = new Map<string, Promise<PlacePhotoMedia>>();

/**
 * Explore: real activities and places without a verified activity yet,
 * merged and ordered by the backend (CU9-CU11).
 * Backend contract: `GET /explore`.
 */
export async function searchExplore(
  params: ExploreSearchParams,
  options: { signal?: AbortSignal } = {},
): Promise<PaginatedResult<ExploreItem>> {
  return apiClient.get<PaginatedResult<ExploreItem>>('/explore', {
    params,
    signal: options.signal,
  });
}

/**
 * Map markers for activities and places within a viewport (CU16).
 * Backend contract: `GET /explore/map`.
 */
export async function getExploreMapMarkers(
  params: ExploreMapParams,
  options: { signal?: AbortSignal } = {},
): Promise<PaginatedResult<ExploreMapMarker>> {
  // The API accepts at most 6 decimal places; a Maps viewport reports more.
  return apiClient.get<PaginatedResult<ExploreMapMarker>>('/explore/map', {
    params: {
      ...params,
      north: round6(params.north),
      south: round6(params.south),
      east: round6(params.east),
      west: round6(params.west),
      ...(params.latitude !== undefined
        ? { latitude: round6(params.latitude) }
        : {}),
      ...(params.longitude !== undefined
        ? { longitude: round6(params.longitude) }
        : {}),
    },
    signal: options.signal,
  });
}

/** A place's page: its live context and the real activities offered there. */
export async function getPlaceDetail(id: number): Promise<PlaceDetailResult> {
  return apiClient.get<PlaceDetailResult>(`/places/${id}`);
}

/**
 * Asks the backend for permission to instantiate `count` Google Places UI
 * Kit elements. SmartPlan enforces a USD 0 monthly cap: past it, `granted`
 * is 0 and the UI shows its own artwork instead.
 */
export async function claimUiKitElements(
  count: number,
  screen: string,
): Promise<{ granted: number; remaining: number }> {
  return apiClient.post<{ granted: number; remaining: number }>(
    '/external-integration/ui-kit/claims',
    { count, screen },
  );
}

/** One live Google photo plus its credit (capped, free-tier only). */
export async function getPlacePhotoMedia(
  googlePlaceId: string,
  maxWidthPx = 1200,
): Promise<PlacePhotoMedia> {
  const key = `${googlePlaceId}:${maxWidthPx}`;
  const pending = inFlightPhotos.get(key);
  if (pending) return pending;
  const request = apiClient.get<PlacePhotoMedia>(
    `/external-integration/places/${encodeURIComponent(googlePlaceId)}/photo-media`,
    { params: { maxWidthPx } },
  ).finally(() => { inFlightPhotos.delete(key); });
  inFlightPhotos.set(key, request);
  return request;
}
