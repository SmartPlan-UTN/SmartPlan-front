import { afterEach, describe, expect, it, vi } from 'vitest';
import { mediaRequestPath } from './media';

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
