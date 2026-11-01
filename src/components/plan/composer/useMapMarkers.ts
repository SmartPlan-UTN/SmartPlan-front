"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getActivityMapMarkers } from "@/lib/api";
import type {
  ActivityMapMarker,
  ActivitySearchParams,
  ActivitySearchResult,
} from "@/types";

import {
  boundsContain,
  padBounds,
  WORLD_BOUNDS,
  type Bounds,
} from "./mapGeometry";
import {
  candidatesFromAssistant,
  candidatesFromMarkers,
  type MapCandidate,
} from "./mapPoints";
import { cachedActivityDetail, lookupActivityDetail } from "./useStopInfo";

/** The most markers `GET /activities/map` returns in one page. */
export const MAP_MARKER_LIMIT = 100;
const CACHE_SIZE = 24;

interface MarkerPage {
  markers: ActivityMapMarker[];
  /** More places match than one page holds. */
  truncated: boolean;
}

/**
 * Pages already fetched, by query + scope: going List → Map → List, undoing a
 * filter or panning back never asks again. Oldest first, so the first key is
 * the one to evict.
 */
const pages = new Map<string, MarkerPage>();

function remember(key: string, page: MarkerPage) {
  pages.delete(key);
  pages.set(key, page);
  if (pages.size > CACHE_SIZE) {
    const oldest = pages.keys().next().value;
    if (oldest !== undefined) pages.delete(oldest);
  }
}

/** Test seam. */
export function clearMapMarkerCache() {
  pages.clear();
}

function scopeKey(bounds: Bounds | null): string {
  if (!bounds) return "all";
  return [bounds.south, bounds.west, bounds.north, bounds.east]
    .map((value) => value.toFixed(3))
    .join(",");
}

export interface MapMarkersState {
  candidates: MapCandidate[];
  /** Results were cut at the page size: zooming in shows the rest. */
  truncated: boolean;
  status: "idle" | "loading" | "error";
  /** The query the current candidates answer; null before the first answer. */
  answeredKey: string | null;
  retry: () => void;
}

/**
 * The catalog query as markers. A query first asks for the whole catalog at
 * once (one request, then the camera moves freely with no more requests).
 * Only when that is more than one page does it switch to the viewport: it
 * then asks for the visible area (padded) again only when the camera leaves
 * what was loaded or zooms in.
 */
export function useMapMarkers(
  map: google.maps.Map | null,
  params: ActivitySearchParams,
  enabled: boolean,
): MapMarkersState {
  const paramsKey = JSON.stringify(params);
  const paramsRef = useRef(params);
  const [page, setPage] = useState<{ key: string; page: MarkerPage } | null>(
    null,
  );
  const [status, setStatus] = useState<MapMarkersState["status"]>("idle");
  const [retryToken, setRetryToken] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  // What the current markers cover, to know when the camera has left it.
  const scopeRef = useRef<{
    paramsKey: string;
    bounds: Bounds | null;
    zoom: number;
    truncated: boolean;
  } | null>(null);

  useEffect(() => {
    paramsRef.current = params;
  });

  // `load` asks again for the viewport from inside its own answer.
  const loadRef = useRef<(bounds: Bounds | null) => MarkerPage | undefined>(
    () => undefined,
  );
  const load = useCallback(
    (bounds: Bounds | null) => {
      if (!map) return;
      const currentKey = JSON.stringify(paramsRef.current);
      const key = `${currentKey}|${scopeKey(bounds)}`;
      const scope = {
        paramsKey: currentKey,
        bounds,
        zoom: map.getZoom() ?? 0,
        truncated: false,
      };
      const known = pages.get(key);
      controllerRef.current?.abort();
      if (known) {
        scopeRef.current = { ...scope, truncated: known.truncated };
        setPage({ key: currentKey, page: known });
        setStatus("idle");
        return known;
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      setStatus("loading");
      getActivityMapMarkers(
        {
          ...paramsRef.current,
          ...(bounds ?? WORLD_BOUNDS),
          page: 1,
          limit: MAP_MARKER_LIMIT,
        },
        { signal: controller.signal },
      )
        .then((result) => {
          if (controller.signal.aborted) return;
          const loaded: MarkerPage = {
            markers: result.data,
            truncated:
              (result.pagination?.total ?? result.data.length) >
              result.data.length,
          };
          remember(key, loaded);
          scopeRef.current = { ...scope, truncated: loaded.truncated };
          setPage({ key: currentKey, page: loaded });
          setStatus("idle");
          // Too much for one page: show what is in view instead.
          if (loaded.truncated && bounds === null) {
            const view = map.getBounds()?.toJSON();
            if (view) loadRef.current(padBounds(view, 1.5));
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setStatus("error");
        });
      return undefined;
    },
    [map],
  );

  useEffect(() => {
    loadRef.current = load;
  });

  // A new query (or the map arriving): ask for all of it.
  useEffect(() => {
    if (!map || !enabled) return;
    const known = load(null);
    if (known?.truncated) {
      const view = map.getBounds()?.toJSON();
      if (view) load(padBounds(view, 1.5));
    }
  }, [map, enabled, paramsKey, retryToken, load]);

  // A cut-off query follows the camera, but only past what is loaded.
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", () => {
      const scope = scopeRef.current;
      if (!scope?.truncated) return;
      const view = map.getBounds()?.toJSON();
      if (!view) return;
      const zoomedIn = (map.getZoom() ?? 0) > scope.zoom;
      if (!scope.bounds || !boundsContain(scope.bounds, view) || zoomedIn) {
        load(padBounds(view, 1.5));
      }
    });
    return () => listener.remove();
  }, [map, load]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const candidates = useMemo(
    () => (page ? candidatesFromMarkers(page.page.markers) : []),
    [page],
  );

  return {
    candidates,
    truncated: page?.page.truncated ?? false,
    status,
    answeredKey: page?.key ?? null,
    retry: useCallback(() => setRetryToken((token) => token + 1), []),
  };
}

/**
 * The assistant's answers as markers, placed where the catalog says each of
 * their places is (one detail lookup per answer, shared with the route).
 */
export function useAssistantCandidates(
  results:
    readonly { activity: ActivitySearchResult; reason: string | null }[] | null,
): { candidates: MapCandidate[]; pending: boolean } {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!results) return;
    let cancelled = false;
    for (const { activity } of results) {
      if (cachedActivityDetail(activity.id) !== undefined) continue;
      void lookupActivityDetail(activity.id).then(() => {
        if (!cancelled) setVersion((current) => current + 1);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [results]);

  return useMemo(() => {
    void version;
    if (!results) return { candidates: [], pending: false };
    return {
      candidates: candidatesFromAssistant(results, cachedActivityDetail),
      pending: results.some(
        ({ activity }) => cachedActivityDetail(activity.id) === undefined,
      ),
    };
  }, [results, version]);
}
