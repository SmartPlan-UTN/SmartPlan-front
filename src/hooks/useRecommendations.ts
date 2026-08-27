"use client";

import { useEffect, useState } from "react";

import { getRecommendations } from "@/lib/api";
import { useSession } from "@/lib/auth";
import type {
  PlanRecommendation,
  PlanRecommendationsResponse,
  RecommendationsMeta,
} from "@/types";

export type RecommendationsStatus = "loading" | "ready" | "empty" | "error";

export interface UseRecommendationsResult {
  status: RecommendationsStatus;
  items: PlanRecommendation[];
  meta: RecommendationsMeta | null;
}

/** One rail's worth. The backend caps at 100; the Home shows a few. */
const RECOMMENDATIONS_LIMIT = 9;
/** Re-fetch only when returning to the Home after this long. */
const CACHE_TTL_MS = 2 * 60 * 1000;

let cache: { at: number; response: PlanRecommendationsResponse } | null = null;
let inFlight: Promise<PlanRecommendationsResponse> | null = null;

/** Test seam: drops the module-level cache and any in-flight request. */
export function resetRecommendationsCache(): void {
  cache = null;
  inFlight = null;
}

/**
 * Resolves device coordinates **without ever prompting** (US19: the section
 * must not be intrusive). Coordinates are sent only when the browser has
 * already granted geolocation; otherwise the request goes out without them
 * and the backend ranks with no distance signal.
 */
async function resolveCoords(): Promise<
  { latitude: number; longitude: number } | undefined
> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return undefined;
  }
  const query = navigator.permissions?.query;
  if (!query) return undefined;

  try {
    const permission = await query.call(navigator.permissions, {
      name: "geolocation" as PermissionName,
    });
    if (permission.state !== "granted") return undefined;
  } catch {
    return undefined;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }),
      () => resolve(undefined),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

function load(): Promise<PlanRecommendationsResponse> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return Promise.resolve(cache.response);
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const coords = await resolveCoords();
    const response = await getRecommendations({
      limit: RECOMMENDATIONS_LIMIT,
      ...coords,
    });
    cache = { at: Date.now(), response };
    return response;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

function toResult(response: PlanRecommendationsResponse): UseRecommendationsResult {
  return {
    status: response.data.length > 0 ? "ready" : "empty",
    items: response.data,
    meta: response.meta,
  };
}

const LOADING: UseRecommendationsResult = {
  status: "loading",
  items: [],
  meta: null,
};

/**
 * Loads the Home's recommended plans (CU20). Non-blocking: it never gates the
 * hero, degrades to `"error"` silently (the section then hides), and only runs
 * for an authenticated session. A module-level cache keeps a return visit to
 * `/` from re-fetching.
 */
export function useRecommendations(): UseRecommendationsResult {
  const { status: sessionStatus } = useSession();
  const authenticated = sessionStatus === "authenticated";
  const [result, setResult] = useState<UseRecommendationsResult>(() =>
    cache && Date.now() - cache.at < CACHE_TTL_MS ? toResult(cache.response) : LOADING,
  );

  useEffect(() => {
    if (!authenticated) return;
    let ignore = false;

    load()
      .then((response) => {
        if (!ignore) setResult(toResult(response));
      })
      .catch(() => {
        if (!ignore) setResult({ status: "error", items: [], meta: null });
      });

    return () => {
      ignore = true;
    };
  }, [authenticated]);

  return authenticated ? result : LOADING;
}
