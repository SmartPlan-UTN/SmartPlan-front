import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaTarget } from '@/types';
import { apiClient } from './client';
import { mediaRequestPath, uploadMedia } from './media';

vi.mock('./client', () => ({ apiClient: { post: vi.fn() } }));

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
