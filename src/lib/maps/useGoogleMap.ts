"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { loadGoogleMaps, GOOGLE_MAPS_AUTH_FAILURE_EVENT } from "./loadGoogleMaps";

export type GoogleMapStatus = "loading" | "ready" | "error";

export interface UseGoogleMapResult {
  status: GoogleMapStatus;
  errorMessage: string | null;
}

/**
 * Shared init/cancel/status boilerplate for embedding a Google Map
 * (LocationPreview's single-marker preview, MapView's full CU16 map):
 * awaits `loadGoogleMaps()`, guards against the component unmounting mid
 * load, and reports a status a caller can render loading/error UI from.
 *
 * `options` is skipped (no load attempt) when `null` — e.g. LocationPreview
 * has nothing to center on until it has coordinates. `onReady` runs once
 * the map exists, for marker/listener setup; its own returned cleanup (if
 * any) runs on unmount alongside releasing the map's listeners.
 */
export function useGoogleMap(
  containerRef: RefObject<HTMLDivElement | null>,
  options: google.maps.MapOptions | null,
  onReady?: (map: google.maps.Map) => (() => void) | void,
): UseGoogleMapResult {
  const [status, setStatus] = useState<GoogleMapStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  });

  const lat = options?.center != null && "lat" in options.center ? options.center.lat : null;
  const lng = options?.center != null && "lng" in options.center ? options.center.lng : null;
  const zoom = options?.zoom ?? null;

  useEffect(() => {
    if (options == null) return;

    let cancelled = false;
    let failed = false;
    let map: google.maps.Map | null = null;
    let readyCleanup: (() => void) | void;

    const unavailable = () => {
      if (cancelled) return;
      failed = true;
      readyCleanup?.();
      readyCleanup = undefined;
      if (map) google.maps.event.clearInstanceListeners(map);
      map = null;
      containerRef.current?.replaceChildren();
      setStatus('error');
      setErrorMessage('No pudimos cargar el mapa. Podés seguir con tu recorrido.');
    };
    window.addEventListener(GOOGLE_MAPS_AUTH_FAILURE_EVENT, unavailable);

    async function init() {
      try {
        await loadGoogleMaps();
        if (cancelled || failed || !containerRef.current) return;

        map = new google.maps.Map(containerRef.current, options as google.maps.MapOptions);
        if (failed) { unavailable(); return; }
        setStatus("ready");
        readyCleanup = onReadyRef.current?.(map);
      } catch {
        unavailable();
      }
    }

    void init();

    return () => {
      cancelled = true;
      window.removeEventListener(GOOGLE_MAPS_AUTH_FAILURE_EVENT, unavailable);
      readyCleanup?.();
      if (map) {
        google.maps.event.clearInstanceListeners(map);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init only on an actual center/zoom change, not on a new (but equal) `options` object identity every render.
  }, [containerRef, lat, lng, zoom]);

  return { status, errorMessage };
}
