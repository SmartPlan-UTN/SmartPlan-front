"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  dismissRecommendation,
  getRecommendations,
  undoDismissRecommendation,
} from "@/lib/api";
import { useSession } from "@/lib/auth";
import { toDismissError } from "@/lib/plans/recommendationDismissErrors";
import type {
  PlanRecommendation,
  PlanRecommendationsResponse,
  RecommendationsMeta,
} from "@/types";

export type RecommendationsStatus = "loading" | "ready" | "empty" | "error";

/** A card in the rail, or the placeholder left where a dismissed one was. */
export type RecommendationSlot =
  | { type: "card"; recommendation: PlanRecommendation }
  | {
      type: "dismissed";
      planId: number;
      title: string;
      /** `shown` while "Deshacer" is offered; `collapsing` on the way out. */
      phase: "shown" | "collapsing";
    };

export interface UseRecommendationsResult {
  status: RecommendationsStatus;
  /** Rail contents in order: live cards and, briefly, "Deshacer" slots. */
  slots: RecommendationSlot[];
  meta: RecommendationsMeta | null;
  /** Remove a plan from the rail (CU21). Optimistic; reconciles on failure. */
  dismiss: (planId: number, title: string) => void;
  /** Undo a dismissal while its slot is still shown (CU21). */
  undo: (planId: number) => void;
  /** Drop the cache and fetch again — used by the inline error state. */
  retry: () => void;
}

/** One rail's worth. The backend caps at 100; the Home shows a few. */
const RECOMMENDATIONS_LIMIT = 9;
/** Re-fetch only when returning to the Home after this long. */
const CACHE_TTL_MS = 2 * 60 * 1000;
/** How long "Deshacer" is offered before the slot starts collapsing. */
const UNDO_WINDOW_MS = 4600;
/** The collapse animation's length — must match `recommended-plans.module.css`. */
const COLLAPSE_MS = 460;

let cache: { at: number; response: PlanRecommendationsResponse } | null = null;
let inFlight: Promise<PlanRecommendationsResponse> | null = null;

/** Test seam: drops the module-level cache and any in-flight request. */
export function resetRecommendationsCache(): void {
  cache = null;
  inFlight = null;
}

/** Drops a plan from the cached response so a quick return to `/` respects it. */
function patchCacheRemove(planId: number): void {
  if (!cache) return;
  cache = {
    at: cache.at,
    response: {
      ...cache.response,
      data: cache.response.data.filter((entry) => entry.plan.id !== planId),
    },
  };
}

/** Puts a plan back into the cached response, at its original position. */
function patchCacheRestore(
  recommendation: PlanRecommendation,
  index: number
): void {
  if (!cache) return;
  if (cache.response.data.some((entry) => entry.plan.id === recommendation.plan.id)) {
    return;
  }
  const data = [...cache.response.data];
  data.splice(Math.min(index, data.length), 0, recommendation);
  cache = { at: cache.at, response: { ...cache.response, data } };
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

interface LoadedState {
  status: RecommendationsStatus;
  items: PlanRecommendation[];
  meta: RecommendationsMeta | null;
}

function toLoaded(response: PlanRecommendationsResponse): LoadedState {
  return {
    status: response.data.length > 0 ? "ready" : "empty",
    items: response.data,
    meta: response.meta,
  };
}

const LOADING: LoadedState = { status: "loading", items: [], meta: null };

interface PendingUndo {
  title: string;
  index: number;
  recommendation: PlanRecommendation;
  phase: "shown" | "collapsing";
}

/**
 * Loads the Home's recommended plans (CU20) and owns the dismiss / undo
 * interaction (CU21). Non-blocking: it never gates the hero, degrades to
 * `"error"` silently (the section then hides), and only runs for an
 * authenticated session. A module-level cache keeps a return visit to `/` from
 * re-fetching — and is patched in step with dismiss / undo.
 */
export function useRecommendations(): UseRecommendationsResult {
  const { status: sessionStatus } = useSession();
  const authenticated = sessionStatus === "authenticated";

  const [loaded, setLoaded] = useState<LoadedState>(() =>
    cache && Date.now() - cache.at < CACHE_TTL_MS
      ? toLoaded(cache.response)
      : LOADING,
  );

  // Committed dismissals hide a card for good; the undo queue keeps a plan's
  // "Deshacer" slot visible for a few seconds.
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [undoQueue, setUndoQueue] = useState<Map<number, PendingUndo>>(
    new Map(),
  );
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>[]>>(new Map());
  const [reloadNonce, setReloadNonce] = useState(0);

  const retry = useCallback(() => {
    resetRecommendationsCache();
    setLoaded(LOADING);
    setReloadNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let ignore = false;

    load()
      .then((response) => {
        if (!ignore) setLoaded(toLoaded(response));
      })
      .catch(() => {
        if (!ignore) setLoaded({ status: "error", items: [], meta: null });
      });

    return () => {
      ignore = true;
    };
  }, [authenticated, reloadNonce]);

  const clearTimer = useCallback((planId: number) => {
    timers.current.get(planId)?.forEach(clearTimeout);
    timers.current.delete(planId);
  }, []);

  // Clear every pending timer on unmount.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((list) => list.forEach(clearTimeout));
      pending.clear();
    };
  }, []);

  const dropFromQueue = useCallback(
    (planId: number) => {
      clearTimer(planId);
      setUndoQueue((current) => {
        if (!current.has(planId)) return current;
        const next = new Map(current);
        next.delete(planId);
        return next;
      });
    },
    [clearTimer],
  );

  const beginCollapse = useCallback(
    (planId: number) => {
      setUndoQueue((current) => {
        const entry = current.get(planId);
        if (!entry || entry.phase === "collapsing") return current;
        const next = new Map(current);
        next.set(planId, { ...entry, phase: "collapsing" });
        return next;
      });
      const list = timers.current.get(planId) ?? [];
      list.push(setTimeout(() => dropFromQueue(planId), COLLAPSE_MS));
      timers.current.set(planId, list);
    },
    [dropFromQueue],
  );

  const dismiss = useCallback(
    (planId: number, title: string) => {
      if (dismissedIds.has(planId)) return;

      const index = loaded.items.findIndex((entry) => entry.plan.id === planId);
      if (index < 0) return;
      const recommendation = loaded.items[index];

      setDismissedIds((current) => new Set(current).add(planId));
      setUndoQueue((current) => {
        const next = new Map(current);
        next.set(planId, { title, index, recommendation, phase: "shown" });
        return next;
      });
      patchCacheRemove(planId);

      clearTimer(planId);
      timers.current.set(planId, [
        setTimeout(() => beginCollapse(planId), UNDO_WINDOW_MS),
      ]);

      void dismissRecommendation(planId).catch((error: unknown) => {
        if (toDismissError(error).kind === "retry") {
          // Nothing changed on the server — put the card back.
          patchCacheRestore(recommendation, index);
          setDismissedIds((current) => {
            const next = new Set(current);
            next.delete(planId);
            return next;
          });
          dropFromQueue(planId);
        }
      });
    },
    [dismissedIds, loaded.items, clearTimer, beginCollapse, dropFromQueue],
  );

  const undo = useCallback(
    (planId: number) => {
      const pending = undoQueue.get(planId);
      if (!pending) return;

      dropFromQueue(planId);
      setDismissedIds((current) => {
        const next = new Set(current);
        next.delete(planId);
        return next;
      });
      patchCacheRestore(pending.recommendation, pending.index);

      void undoDismissRecommendation(planId).catch(() => {
        // A failed undo is rare and self-healing: the plan is visible again and
        // the next load reconciles with the server either way.
      });
    },
    [undoQueue, dropFromQueue],
  );

  const slots: RecommendationSlot[] = [];
  for (const recommendation of loaded.items) {
    const planId = recommendation.plan.id;
    const pending = undoQueue.get(planId);
    if (pending) {
      slots.push({
        type: "dismissed",
        planId,
        title: pending.title,
        phase: pending.phase,
      });
    } else if (!dismissedIds.has(planId)) {
      slots.push({ type: "card", recommendation });
    }
  }

  if (!authenticated) {
    return {
      status: "loading",
      slots: [],
      meta: null,
      dismiss: () => undefined,
      undo: () => undefined,
      retry: () => undefined,
    };
  }

  return {
    status: loaded.status,
    slots,
    meta: loaded.meta,
    dismiss,
    undo,
    retry,
  };
}
