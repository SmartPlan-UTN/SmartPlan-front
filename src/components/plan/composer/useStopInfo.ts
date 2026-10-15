"use client";

import { useEffect, useMemo, useState } from "react";

import { getActivity } from "@/lib/api";
import type { ActivityCategorySummary, ActivityDetailResult } from "@/types";

import type { ComposerStop } from "./draft";
import { firstCoords, type Coords } from "./routeDistance";

export interface StopInfo {
  coords: Coords | null;
  categories: ActivityCategorySummary[];
}

/**
 * Activity details, shared by the route (positions of its stops) and the
 * map (a preview's duration, an assistant result's places), so the same
 * activity is never asked for twice. Lookups survive step changes and
 * remounts; an activity does not move. A failed lookup is remembered as
 * `null`: the route then shows no distance for it, as before.
 */
const details = new Map<number, ActivityDetailResult | null>();
const inFlight = new Map<number, Promise<ActivityDetailResult | null>>();
/** Derived once per detail, so the route keeps receiving the same objects. */
const stopInfos = new Map<number, StopInfo>();

export function lookupActivityDetail(
  activityId: number,
): Promise<ActivityDetailResult | null> {
  if (details.has(activityId)) {
    return Promise.resolve(details.get(activityId) ?? null);
  }
  const pending = inFlight.get(activityId);
  if (pending) return pending;
  const request = getActivity(activityId)
    .catch(() => null)
    .then((detail) => {
      details.set(activityId, detail);
      inFlight.delete(activityId);
      return detail;
    });
  inFlight.set(activityId, request);
  return request;
}

/** A detail already looked up: `undefined` while unknown, `null` if it failed. */
export function cachedActivityDetail(
  activityId: number,
): ActivityDetailResult | null | undefined {
  return details.get(activityId);
}

function stopInfoFor(activityId: number): StopInfo | undefined {
  if (!details.has(activityId)) return undefined;
  let info = stopInfos.get(activityId);
  if (!info) {
    const detail = details.get(activityId);
    info = detail
      ? { coords: firstCoords(detail.locations), categories: detail.categories }
      : { coords: null, categories: [] };
    stopInfos.set(activityId, info);
  }
  return info;
}

/**
 * One activity's detail from the shared cache, asked for if it is not there
 * yet: `undefined` while it loads, `null` if the lookup failed.
 */
export function useActivityDetail(
  activityId: number | null,
): ActivityDetailResult | null | undefined {
  const [, setVersion] = useState(0);
  const known = activityId === null ? undefined : details.get(activityId);
  const missing = activityId !== null && !details.has(activityId);

  useEffect(() => {
    if (activityId === null || !missing) return;
    let cancelled = false;
    void lookupActivityDetail(activityId).then(() => {
      if (!cancelled) setVersion((current) => current + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [activityId, missing]);

  return known;
}

/** Warm the cache on intent (hover, focus) so opening feels instant. */
export function prefetchActivityDetail(activityId: number) {
  if (!details.has(activityId)) void lookupActivityDetail(activityId);
}

/** Test seam: forget what was looked up. */
export function clearStopInfoCache() {
  details.clear();
  inFlight.clear();
  stopInfos.clear();
}

/**
 * Position and categories of each stop, from the activity detail (search
 * results carry no coordinates, and an edited plan's stops carry neither).
 * A stop whose lookup failed resolves to no position: the route simply shows
 * no distance there. Nothing here ever changes the draft.
 */
export function useStopInfo(
  stops: ComposerStop[],
  enabled: boolean,
): Record<number, StopInfo> {
  // Bumped when a lookup lands so the memo below reads the cache again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    for (const stop of stops) {
      const id = stop.activity.id;
      if (details.has(id)) continue;
      void lookupActivityDetail(id).then(() => {
        if (!cancelled) setVersion((current) => current + 1);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [stops, enabled]);

  return useMemo(() => {
    // `version` changes when the cache does: read it again.
    void version;
    const known: Record<number, StopInfo> = {};
    for (const stop of stops) {
      const info = stopInfoFor(stop.activity.id);
      if (info) known[stop.activity.id] = info;
    }
    return known;
  }, [stops, version]);
}

/** The draft's stops with whatever has been looked up laid over them. */
export function withStopInfo(
  stops: ComposerStop[],
  info: Record<number, StopInfo>,
): ComposerStop[] {
  return stops.map((stop) => {
    const found = info[stop.activity.id];
    if (!found) return stop;
    return {
      ...stop,
      coords: found.coords,
      activity: stop.activity.categories.length
        ? stop.activity
        : { ...stop.activity, categories: found.categories },
    };
  });
}
