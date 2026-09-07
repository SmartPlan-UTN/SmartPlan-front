"use client";

import { useCallback, useRef, useState } from "react";

import { getPreferences } from "@/lib/api";
import type { SurpriseLocationErrorKind } from "@/lib/recommendation/planRequestErrors";
import type { UserPreferencesResponse } from "@/types";

export interface SurpriseCoords {
  latitude: number;
  longitude: number;
}

export type SurpriseLocationSource = "device" | "preferred-area";

export type SurpriseLocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "loading-fallback" }
  | { status: "resolved"; coords: SurpriseCoords; source: SurpriseLocationSource }
  | { status: "error"; kind: SurpriseLocationErrorKind };

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
 * 09). Device GPS first; if the user denies it or it is unavailable, the
 * profile's preferred area is the fallback — its coordinates are already
 * resolved server-side when preferences are saved, so no extra geocoding
 * happens here. With neither, the caller gets an actionable error, never a
 * dead end.
 *
 * Permission is only ever requested from `request()` — an explicit user
 * action — never on mount. Preferences are fetched once per request, in
 * parallel with the GPS prompt, and reused for the category hint.
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

    const preferencesPromise: Promise<UserPreferencesResponse | null> =
      getPreferences()
        .then((preferences) => {
          if (runId.current === thisRun) {
            setHasCategoryPreferences(preferences.categories.length > 0);
          }
          return preferences;
        })
        .catch(() => null);

    const resolveFromPreferredArea = async (
      onMissing: SurpriseLocationErrorKind,
    ): Promise<void> => {
      setState({ status: "loading-fallback" });
      const preferences = await preferencesPromise;
      if (runId.current !== thisRun) return;

      const area = preferences?.preferredArea;
      if (area) {
        setState({
          status: "resolved",
          coords: { latitude: area.latitude, longitude: area.longitude },
          source: "preferred-area",
        });
        return;
      }
      setState({
        status: "error",
        kind: preferences ? "no-location" : onMissing,
      });
    };

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      void resolveFromPreferredArea("unsupported");
      return;
    }

    void getCurrentPosition().then(
      (position) => {
        if (runId.current !== thisRun) return;
        setState({
          status: "resolved",
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          source: "device",
        });
      },
      (error: GeolocationPositionError) => {
        if (runId.current !== thisRun) return;
        void resolveFromPreferredArea(
          error.code === error.PERMISSION_DENIED
            ? "denied-no-fallback"
            : "unavailable-no-fallback",
        );
      },
    );
  }, []);

  return { state, hasCategoryPreferences, request, reset };
}
