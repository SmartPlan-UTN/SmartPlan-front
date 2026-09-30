"use client";

import { useState } from "react";

import { Button, Icon } from "@/components/ui";
import { suggestActivities } from "@/lib/api";
import { formatArs, formatDuration } from "@/lib/utils";
import type { ActivitySearchResult, ActivitySuggestion } from "@/types";

import styles from "./plan-create.module.css";

export interface ActivitySuggestionsPanelProps {
  title: string;
  description: string;
  /** Activities already on the itinerary: never suggested again. */
  excludeActivityIds: number[];
  disabled?: boolean;
  onAdd: (activity: ActivitySearchResult) => void;
}

type Status = "idle" | "loading" | "done" | "error";

/**
 * A suggestion in the shape the editors' itineraries already take. The
 * suggestion carries no rating or distance; the editors only read the id,
 * name, cost, and duration.
 */
function toSearchResult(suggestion: ActivitySuggestion): ActivitySearchResult {
  return {
    ...suggestion,
    averageRating: 0,
    ratingCount: 0,
    distanceKm: null,
    categories: [],
  };
}

/**
 * "Recomendar actividades" in the plan editor (#130): reads what the person
 * wrote in the title (and the description) and suggests catalog activities
 * to add, skipping the ones already on the plan. It fills in the plan being
 * edited; planning a whole outing is Inicio's "Planificar", a different flow.
 */
export function ActivitySuggestionsPanel({
  title,
  description,
  excludeActivityIds,
  disabled = false,
  onAdd,
}: ActivitySuggestionsPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const canSuggest = title.trim().length > 0 && !disabled;

  async function suggest() {
    setStatus("loading");
    try {
      const result = await suggestActivities({
        title: title.trim(),
        description: description.trim() || undefined,
        excludeActivityIds,
      });
      setSuggestions(result.data);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const visible = suggestions.filter(
    (suggestion) => !excludeActivityIds.includes(suggestion.id),
  );

  return (
    <section
      className={styles.suggestionsPanel}
      aria-labelledby="activity-suggestions-title"
    >
      <div className={styles.suggestionsHeader}>
        <div className={styles.suggestionsText}>
          <strong id="activity-suggestions-title">
            ¿No sabés qué sumar?
          </strong>
          <p>
            {title.trim().length > 0
              ? "Te recomendamos actividades según el nombre y la descripción de tu plan."
              : "Escribí el nombre del plan y te recomendamos actividades para sumarle."}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!canSuggest || status === "loading"}
          onClick={() => void suggest()}
        >
          <Icon
            name={status === "loading" ? "loader-circle" : "sparkles"}
            size={16}
            className={status === "loading" ? "sp-animate-spin" : undefined}
            aria-hidden="true"
          />
          Recomendar actividades
        </Button>
      </div>

      <div aria-live="polite">
        {status === "error" ? (
          <p className={styles.fieldError}>
            No pudimos recomendarte actividades. Probá de nuevo.
          </p>
        ) : null}
        {status === "done" && visible.length === 0 ? (
          <p className={styles.suggestionsEmpty}>
            No encontramos actividades para eso. Probá con otras palabras en el
            nombre o la descripción.
          </p>
        ) : null}
        {status === "done" && visible.length > 0 ? (
          <ul className={styles.suggestionList}>
            {visible.map((suggestion) => (
              <li key={suggestion.id} className={styles.activityCard}>
                <div className={styles.activityInfo}>
                  <p className={styles.activityName}>{suggestion.name}</p>
                  <div className={styles.activityMeta}>
                    <span>{formatArs(suggestion.estimatedCost)}</span>
                    <span>•</span>
                    <span>{formatDuration(suggestion.estimatedDuration)}</span>
                    {suggestion.categories.length > 0 ? (
                      <>
                        <span>•</span>
                        <span>{suggestion.categories.join(", ")}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghostEmber"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onAdd(toSearchResult(suggestion))}
                  aria-label={`Agregar ${suggestion.name}`}
                >
                  + Agregar
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
