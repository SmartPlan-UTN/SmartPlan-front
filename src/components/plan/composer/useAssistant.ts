"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks";
import { assistantImprove, assistantSearch, assistantSuggest } from "@/lib/api";
import type {
  ActivitySearchResult,
  AssistantProposal,
  AssistantSearchResponse,
  AssistantSuggestResponse,
} from "@/types";

import type { ComposerStop } from "./draft";
import {
  useSuggestedActivities,
  type SuggestedActivities,
} from "./useSuggestedActivities";

/**
 * What the assistant says is never applied from here: these hooks only fetch
 * and hold proposals. Every one of them is allowed to fail (the API answers
 * 503 when the model is slow or down, 429 past the per-person budget) and
 * every failure leaves the composer exactly as it was, with its regular
 * search. A request is cancelled the moment its answer stops being wanted (a
 * newer one replaced it, the route changed, the person navigated away), and
 * no request waits longer than `ASSISTANT_CLIENT_TIMEOUT_MS`.
 */

const SUGGEST_DEBOUNCE_MS = 600;
/** A little over the API's own 7 s: the screen never waits on a silent request. */
export const ASSISTANT_CLIENT_TIMEOUT_MS = 10_000;
/** Suggestions already asked for a given route are not asked again (undo, back and forth). */
const SUGGEST_CACHE_SIZE = 20;
const suggestCache = new Map<string, AssistantSuggestResponse>();

/** Test seam. */
export function clearAssistantCache() {
  suggestCache.clear();
}

/**
 * Runs one assistant request with a deadline. Exactly one of `onDone` /
 * `onFail` fires, and only if the returned `cancel` was not called first.
 */
function startRequest<T>(
  run: (signal: AbortSignal) => Promise<T>,
  onDone: (value: T) => void,
  onFail: () => void,
): () => void {
  const controller = new AbortController();
  let finished = false;
  const finish = (action: () => void) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    action();
  };
  const timer = setTimeout(
    () =>
      finish(() => {
        controller.abort();
        onFail();
      }),
    ASSISTANT_CLIENT_TIMEOUT_MS,
  );
  run(controller.signal).then(
    (value) => finish(() => onDone(value)),
    () => finish(onFail),
  );
  return () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    controller.abort();
  };
}

/** The API's answers are trusted for their shape only as far as this: a malformed one counts as unavailable. */
const isSearchResponse = (value: unknown): value is AssistantSearchResponse =>
  typeof value === "object" &&
  value !== null &&
  Array.isArray((value as AssistantSearchResponse).results) &&
  Array.isArray((value as AssistantSearchResponse).interpretation?.chips);
const isSuggestResponse = (value: unknown): value is AssistantSuggestResponse =>
  typeof value === "object" &&
  value !== null &&
  Array.isArray((value as AssistantSuggestResponse).suggestions);
const isImproveResponse = (
  value: unknown,
): value is { proposals: AssistantProposal[] } =>
  typeof value === "object" &&
  value !== null &&
  Array.isArray((value as { proposals?: unknown }).proposals);

/** Three or more words: reads like a sentence, not a keyword. */
export function looksLikeRequest(text: string): boolean {
  return text.trim().split(/\s+/).filter(Boolean).length >= 3;
}

// ------------------------------------------------------------------ search

export type AssistantSearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "ready"; query: string; response: AssistantSearchResponse }
  | { status: "unavailable"; query: string };

/** Natural-language search for an explicit `query`; `null` means "not asked". */
export function useAssistantSearch(
  query: string | null,
  stopActivityIds: number[],
): AssistantSearchState {
  const [result, setResult] = useState<
    | { query: string; response: AssistantSearchResponse }
    | { query: string; failed: true }
    | null
  >(null);
  // The route may change while the answer is on screen: it must not re-ask.
  const stopsRef = useRef(stopActivityIds);
  useEffect(() => {
    stopsRef.current = stopActivityIds;
  });

  useEffect(() => {
    if (!query) return;
    // Returning the canceller makes a newer sentence (or leaving) drop this
    // request and ignore whatever it would have answered.
    return startRequest(
      (signal) =>
        assistantSearch(
          { query, stopActivityIds: stopsRef.current },
          { signal },
        ),
      (response) =>
        setResult(
          isSearchResponse(response)
            ? { query, response }
            : { query, failed: true },
        ),
      () => setResult({ query, failed: true }),
    );
  }, [query]);

  return useMemo<AssistantSearchState>(() => {
    if (!query) return { status: "idle" };
    if (!result || result.query !== query) return { status: "loading", query };
    return "failed" in result
      ? { status: "unavailable", query }
      : { status: "ready", query, response: result.response };
  }, [query, result]);
}

// ------------------------------------------------------------- suggestions

export interface RouteSuggestion {
  activity: ActivitySearchResult;
  /** Why it fits this route, in the assistant's words; null from the basic lookup. */
  reason: string | null;
}

export interface RouteAssistance {
  items: RouteSuggestion[];
  gap: AssistantSuggestResponse["gap"];
  status: SuggestedActivities["status"];
  /** "ai" when the assistant answered, "basic" for the full-text lookup. */
  source: "ai" | "basic";
}

/**
 * "Para completar tu recorrido": suggestions that fit the route, with the
 * reason and the kind of activity it lacks. If the assistant cannot answer it
 * quietly degrades to the plain full-text suggestions the composer always had.
 */
export function useRouteAssistance({
  title,
  description,
  stops,
  enabled,
}: {
  title: string;
  description: string;
  stops: ComposerStop[];
  enabled: boolean;
}): RouteAssistance {
  const stopIds = useMemo(() => stops.map((stop) => stop.activity.id), [stops]);
  const key = JSON.stringify([title.trim(), description.trim(), stopIds]);
  const debouncedKey = useDebouncedValue(key, SUGGEST_DEBOUNCE_MS);
  const [result, setResult] = useState<
    | { key: string; response: AssistantSuggestResponse }
    | { key: string; failed: true }
    | null
  >(null);

  useEffect(() => {
    if (!enabled) return;
    const [debouncedTitle, debouncedDescription, ids] = JSON.parse(
      debouncedKey,
    ) as [string, string, number[]];
    if (!debouncedTitle) return;

    // Already answered for this very route (undo, back and forth): nothing to ask.
    if (suggestCache.has(debouncedKey)) return;
    return startRequest(
      (signal) =>
        assistantSuggest(
          {
            title: debouncedTitle,
            ...(debouncedDescription
              ? { description: debouncedDescription }
              : {}),
            stopActivityIds: ids,
          },
          { signal },
        ),
      (response) => {
        if (!isSuggestResponse(response)) {
          setResult({ key: debouncedKey, failed: true });
          return;
        }
        suggestCache.set(debouncedKey, response);
        if (suggestCache.size > SUGGEST_CACHE_SIZE) {
          suggestCache.delete(suggestCache.keys().next().value as string);
        }
        setResult({ key: debouncedKey, response });
      },
      () => setResult({ key: debouncedKey, failed: true }),
    );
  }, [debouncedKey, enabled]);

  const failed = result !== null && "failed" in result;
  const basic = useSuggestedActivities({
    title,
    description,
    stops,
    enabled: enabled && failed,
  });

  return useMemo<RouteAssistance>(() => {
    const onRoute = new Set(stopIds);
    const cached = enabled ? suggestCache.get(debouncedKey) : undefined;
    const answer =
      cached ?? (result && !("failed" in result) ? result.response : null);
    if (answer) {
      return {
        items: answer.suggestions
          .filter((item) => !onRoute.has(item.activity.id))
          .map((item) => ({ activity: item.activity, reason: item.reason })),
        gap: answer.gap,
        status: cached || result?.key === key ? "idle" : "loading",
        source: "ai",
      };
    }
    if (failed) {
      return {
        items: basic.items.map((activity) => ({ activity, reason: null })),
        gap: null,
        status: basic.status,
        source: "basic",
      };
    }
    return {
      items: [],
      gap: null,
      status: enabled && title.trim() ? "loading" : "idle",
      source: "ai",
    };
  }, [basic, debouncedKey, enabled, failed, key, result, stopIds, title]);
}

// ------------------------------------------------------------- improvement

export type ImprovementState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; proposals: AssistantProposal[] }
  | { status: "unavailable" };

/**
 * "Mejorar recorrido", on request only. The proposals belong to the exact
 * route they were computed for: as soon as the route changes they are gone
 * (and an answer that arrives for an older route is ignored), so nothing
 * stale can ever be applied.
 */
export function useRouteImprovement(
  title: string,
  stops: ComposerStop[],
): { state: ImprovementState; request: () => void; dismiss: () => void } {
  const signature = stops.map((stop) => stop.activity.id).join(",");
  const [held, setHeld] = useState<{
    signature: string;
    state: ImprovementState;
  } | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const latest = useRef({ title, signature });
  useEffect(() => {
    latest.current = { title, signature };
  });

  // Leaving the screen, or changing the route, drops the request in flight.
  useEffect(() => () => cancelRef.current?.(), []);
  useEffect(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, [signature]);

  const request = useCallback(() => {
    const asked = latest.current;
    // A second press while one is in flight does nothing.
    if (
      held?.signature === asked.signature &&
      held.state.status === "loading"
    ) {
      return;
    }
    cancelRef.current?.();
    setHeld({ signature: asked.signature, state: { status: "loading" } });
    cancelRef.current = startRequest(
      (signal) =>
        assistantImprove(
          {
            title: asked.title.trim() || "Mi plan",
            stopActivityIds: asked.signature.split(",").map(Number),
          },
          { signal },
        ),
      (response) =>
        setHeld({
          signature: asked.signature,
          state: isImproveResponse(response)
            ? { status: "ready", proposals: response.proposals }
            : { status: "unavailable" },
        }),
      () =>
        setHeld({
          signature: asked.signature,
          state: { status: "unavailable" },
        }),
    );
  }, [held]);

  const dismiss = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setHeld(null);
  }, []);

  const state: ImprovementState =
    held && held.signature === signature ? held.state : { status: "idle" };
  return { state, request, dismiss };
}
