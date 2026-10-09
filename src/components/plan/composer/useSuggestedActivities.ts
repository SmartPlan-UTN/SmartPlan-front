"use client";

import { useEffect, useMemo, useState } from "react";

import { useDebouncedValue } from "@/hooks";
import { suggestActivities } from "@/lib/api";
import type { ActivitySearchResult, ActivitySuggestion } from "@/types";

import type { ComposerStop } from "./draft";

const SUGGESTIONS_DEBOUNCE_MS = 500;
const MAX_DESCRIPTION = 2000;

export interface SuggestedActivities {
  items: ActivitySearchResult[];
  status: "idle" | "loading" | "error";
}

/**
 * The suggestion in the shape the catalog rows already take. A suggestion
 * carries no rating, distance, or category ids, so those stay empty.
 */
function toSearchResult(suggestion: ActivitySuggestion): ActivitySearchResult {
  return {
    id: suggestion.id,
    name: suggestion.name,
    description: suggestion.description,
    estimatedCost: suggestion.estimatedCost,
    estimatedDuration: suggestion.estimatedDuration,
    type: suggestion.type,
    averageRating: 0,
    ratingCount: 0,
    distanceKm: null,
    categories: suggestion.categories.map((name, index) => ({
      id: index,
      name,
    })),
  };
}

/**
 * "Sugeridas para tu plan": catalog activities that match the words of the
 * plan's name, its note, and the activities already on the route. It is a
 * read-only lookup against `GET /activity-suggestions`; nothing reaches the
 * draft until the person presses "Sumar".
 */
export function useSuggestedActivities({
  title,
  description,
  stops,
  enabled,
}: {
  title: string;
  description: string;
  stops: ComposerStop[];
  enabled: boolean;
}): SuggestedActivities {
  const stopIds = useMemo(
    () => stops.map((stop) => stop.activity.id),
    [stops],
  );
  const context = useMemo(() => {
    const stopNames = stops.map((stop) => stop.activity.name).join(". ");
    return [description.trim(), stopNames]
      .filter(Boolean)
      .join(". ")
      .slice(0, MAX_DESCRIPTION);
  }, [description, stops]);

  const requestKey = JSON.stringify([title.trim(), context, stopIds]);
  const debouncedKey = useDebouncedValue(requestKey, SUGGESTIONS_DEBOUNCE_MS);
  const [result, setResult] = useState<{
    key: string;
    items: ActivitySearchResult[];
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const [debouncedTitle, debouncedContext, debouncedIds] = JSON.parse(
      debouncedKey,
    ) as [string, string, number[]];
    if (!debouncedTitle) return;

    let cancelled = false;
    suggestActivities({
      title: debouncedTitle,
      description: debouncedContext || undefined,
      excludeActivityIds: debouncedIds,
    })
      .then(({ data }) => {
        if (!cancelled) {
          setResult({
            key: debouncedKey,
            items: data.map(toSearchResult),
            failed: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ key: debouncedKey, items: [], failed: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedKey, enabled]);

  // Keep showing the previous ideas while the next ones load, so the group
  // does not collapse and reflow on every keystroke or added stop.
  const status =
    result?.failed && result.key === debouncedKey
      ? "error"
      : result === null || result.key !== requestKey
        ? "loading"
        : "idle";
  const items = useMemo(
    () => (result?.items ?? []).filter((item) => !stopIds.includes(item.id)),
    [result, stopIds],
  );

  return { items, status: enabled && title.trim() ? status : "idle" };
}
