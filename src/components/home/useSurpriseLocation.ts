"use client";

import { useCallback, useRef, useState } from "react";

import { getPreferences } from "@/lib/api";

export interface SurpriseCoords {
  latitude: number;
  longitude: number;
}

/**
 * `default` covers every case where neither device GPS nor a saved
 * preferred area could be resolved. The backend never needs coordinates —
 * `POST /plan-requests/surprise` falls back to a sensible department on its
 * own — so this is never an error state, only a note about which signal
 * was actually used (CU19).
 */
export type SurpriseLocationSource = "device" | "preferred-area" | "default";

export type SurpriseLocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "loading-fallback" }
  | {
      status: "resolved";
      coords: SurpriseCoords | null;
      source: SurpriseLocationSource;
    };

export interface UseSurpriseLocationResult {
  state: SurpriseLocationState;
  /**
   * Whether the user has saved interest categories. `null` until the first
   * `request()` has loaded preferences. Drives the non-intrusive
   * "te sorprendemos con algo completamente nuevo" hint.
   */
  hasCategoryPreferences: boolean | null;
  /** Explicit user action: resolve a location for a surprise plan. */
  request: () => void;
  /** Back to idle so the user can ask again ("usar otra ubicación"). */
  reset: () => void;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 60_000,
};

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      GEOLOCATION_OPTIONS,
    );
  });
}

/**
 * Resolves the location a surprise plan should be generated from (CU19 · PAN
 * 09). Device GPS first when enabled in the saved preferences; if the user denies it or it is unavailable, the
 * profile's preferred area is the fallback — its coordinates are already
 * resolved server-side when preferences are saved, so no extra geocoding
 * happens here. With neither available, this still resolves (`coords:
 * null`, `source: "default"`): the request is submitted anyway and the
 * backend picks a sensible department on its own, so a missing location
 * is never a dead end.
 *
 * Permission is only ever requested from `request()` — an explicit user
 * action — never on mount. Preferences are fetched once per request, before
 * requesting GPS, and reused for the category hint.
 */
export function useSurpriseLocation(): UseSurpriseLocationResult {
  const [state, setState] = useState<SurpriseLocationState>({ status: "idle" });
  const [hasCategoryPreferences, setHasCategoryPreferences] = useState<
    boolean | null
  >(null);
  const runId = useRef(0);

  const reset = useCallback(() => {
    runId.current += 1;
    setState({ status: "idle" });
  }, []);

  const request = useCallback(() => {
    runId.current += 1;
    const thisRun = runId.current;
    setState({ status: "locating" });

    setHasCategoryPreferences(null);
    const resolve = async (): Promise<void> => {
      const preferences = await getPreferences().catch(() => null);
      if (runId.current !== thisRun) return;
      setHasCategoryPreferences(preferences ? preferences.categories.length > 0 : null);

      if (preferences?.useDeviceLocation && typeof navigator !== "undefined" && "geolocation" in navigator) {
        try {
          const position = await getCurrentPosition();
          if (runId.current !== thisRun) return;
          setState({ status: "resolved", coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }, source: "device" });
          return;
        } catch {
          if (runId.current !== thisRun) return;
        }
      }
      const area = preferences?.preferredArea;
      setState(area ? {
        status: "resolved",
        coords: { latitude: area.latitude, longitude: area.longitude },
        source: "preferred-area",
      } : { status: "resolved", coords: null, source: "default" });
    };
    void resolve();
  }, []);

  return { state, hasCategoryPreferences, request, reset };
}
