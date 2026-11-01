import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaTarget } from '@/types';
import { apiClient } from './client';
import { downloadMedia, mediaRequestPath, readImageAttribution, uploadMedia } from './media';

vi.mock('./client', () => ({ apiClient: { post: vi.fn(), request: vi.fn() } }));

describe('uploadMedia', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each<[MediaTarget, string]>([
    ['activity', '/activities/3/images'],
    ['place', '/places/3/images'],
    ['plan', '/plans/3/images'],
    ['rating', '/ratings/3/images'],
    ['feedback', '/feedback/3/images'],
  ])('uploads %s photos through the backend route', async (target, path) => {
    const file = new File(['photo'], 'activity.png', { type: 'image/png' });
    const image = { id: 8, url: `/api/media/${target}/8` };
    vi.mocked(apiClient.post).mockResolvedValueOnce(image);

    await expect(uploadMedia(target, 3, file)).resolves.toEqual(image);

    expect(apiClient.post).toHaveBeenCalledWith(path, expect.any(FormData), {
      headers: { 'Content-Type': undefined },
      onUploadProgress: expect.any(Function),
    });
    const form = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect(form.get('file')).toBe(file);
  });

  it('propagates upload failures so the gallery can offer a retry', async () => {
    const failure = new Error('Upload failed');
    vi.mocked(apiClient.post).mockRejectedValueOnce(failure);

    await expect(uploadMedia('activity', 3, new File(['photo'], 'activity.png'))).rejects.toBe(failure);
  });
});

describe('mediaRequestPath', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('keeps exactly one /api prefix for the configured backend', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.smartplan.test/api');
    expect(mediaRequestPath('/api/media/plan/18')).toBe('/media/plan/18');
  });

  it('rejects URLs outside the SmartPlan API', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.smartplan.test/api');
    expect(() => mediaRequestPath('https://other.test/api/media/plan/18')).toThrow();
    expect(() => mediaRequestPath('/api/users/me')).toThrow();
  });
});

describe('place photos (SmartPlan-back#102)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('accepts the place photo route, keeping its query', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.smartplan.test/api');
    expect(mediaRequestPath('/api/activity-places/12/photo')).toBe('/activity-places/12/photo');
    expect(mediaRequestPath('/api/activity-places/12/photo?width=480')).toBe(
      '/activity-places/12/photo?width=480',
    );
    expect(() => mediaRequestPath('/api/activity-places/12')).toThrow();
  });

  it('reads Google credit from the response headers', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.smartplan.test/api');
    const blob = new Blob(['photo']);
    vi.mocked(apiClient.request).mockResolvedValueOnce({
      data: blob,
      headers: {
        'x-photo-provider': 'google_maps',
        'x-photo-attributions': encodeURIComponent(
          JSON.stringify([{ displayName: 'Ana Pérez', uri: 'https://maps.google.com/ana' }]),
        ),
      },
    } as never);

    await expect(downloadMedia('/api/activity-places/12/photo')).resolves.toEqual({
      blob,
      attribution: {
        provider: 'google_maps',
        authors: [{ displayName: 'Ana Pérez', uri: 'https://maps.google.com/ana' }],
      },
    });
    expect(apiClient.request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/activity-places/12/photo',
      responseType: 'blob',
    });
  });

  it('has no credit for an uploaded image', () => {
    expect(readImageAttribution(undefined, undefined)).toBeNull();
  });

  it('keeps the Google Maps credit when the author list is malformed', () => {
    expect(readImageAttribution('google_maps', '%E0%A4%A')).toEqual({ provider: 'google_maps', authors: [] });
    expect(readImageAttribution('google_maps', encodeURIComponent('{"not":"a list"}'))).toEqual({
      provider: 'google_maps',
      authors: [],
    });
  });

  it('drops author links that are not https', () => {
    const header = encodeURIComponent(
      JSON.stringify([
        { displayName: 'Ana', uri: 'javascript:alert(1)' },
        { uri: 'https://maps.google.com/nameless' },
      ]),
    );
    expect(readImageAttribution('google_maps', header)).toEqual({
      provider: 'google_maps',
      authors: [{ displayName: 'Ana', uri: null }],
    });
  });
});
