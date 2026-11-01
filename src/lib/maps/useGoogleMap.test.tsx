import { act, renderHook, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GOOGLE_MAPS_AUTH_FAILURE_EVENT } from './loadGoogleMaps';
import { useGoogleMap } from './useGoogleMap';

vi.mock('./loadGoogleMaps', () => ({ loadGoogleMaps: vi.fn().mockResolvedValue(undefined), GOOGLE_MAPS_AUTH_FAILURE_EVENT: 'smartplan:maps-auth-failure' }));
afterEach(() => vi.unstubAllGlobals());

describe('map authentication failures', () => {
  it('clears an initialized provider error and lets the product show its fallback', async () => {
    const clear = vi.fn();
    vi.stubGlobal('google', { maps: { Map: class {}, event: { clearInstanceListeners: clear } } });
    const ref = createRef<HTMLDivElement>();
    ref.current = document.createElement('div');
    const cleanup = vi.fn();
    const { result, unmount } = renderHook(() => useGoogleMap(ref, { center: { lat: -32.89, lng: -68.84 }, zoom: 13 }, () => cleanup));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => { window.dispatchEvent(new Event(GOOGLE_MAPS_AUTH_FAILURE_EVENT)); });
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('No pudimos cargar el mapa. Podés seguir con tu recorrido.');
    expect(cleanup).toHaveBeenCalledOnce();
    unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
