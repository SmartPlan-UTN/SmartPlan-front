import { memo, type CSSProperties } from "react";

import { Icon } from "@/components/ui";
import { formatArs, formatDuration } from "@/lib/utils";
import type { ActivitySearchResult } from "@/types";

import styles from "./SuggestionCard.module.css";

import { categoryLabel, localizeCatalogText } from "@/lib/utils/catalogLabels";
interface SuggestionCardProps {
  /** Position in the rail: cards arrive one after another, once. */
  index: number;
  activity: ActivitySearchResult;
  /** Why it fits this route, in the assistant's words. */
  reason: string | null;
  /** Its number in the route when it is a stop; null when it is not. */
  stopNumber: number | null;
  disabled: boolean;
  onAdd: (activity: ActivitySearchResult) => void;
  onRemove: (activityId: number) => void;
}

/**
 * A suggestion as a card in the "ideas" rail. Pressing Sumar is the only way
 * it reaches the route; pressing it again (now ✓) takes it back out.
 */
export const SuggestionCard = memo(function SuggestionCard({
  index,
  activity,
  reason,
  stopNumber,
  disabled,
  onAdd,
  onRemove,
}: SuggestionCardProps) {
  const added = stopNumber !== null;
  const raw = activity.categories[0]?.name ?? activity.type;
  const category = raw ? categoryLabel(raw) : null;

  return (
    <li
      className={styles.card}
      style={{ "--card-index": index } as CSSProperties}
    >
      {category ? <span className={styles.category}>{category}</span> : null}
      <h5 title={activity.name}>{activity.name}</h5>
      {reason ? <p className={styles.reason}>{localizeCatalogText(reason)}</p> : null}
      <p className={styles.meta}>
        {formatDuration(activity.estimatedDuration)} ·{" "}
        {formatArs(activity.estimatedCost)}
      </p>
      <button
        type="button"
        className={`${styles.add} ${added ? styles.added : ""}`}
        aria-label={
          added
            ? `Quitar ${activity.name} del recorrido`
            : `Agregar ${activity.name}`
        }
        title={added ? "Quitar del recorrido" : undefined}
        disabled={disabled}
        onClick={() => (added ? onRemove(activity.id) : onAdd(activity))}
      >
        <Icon name={added ? "check" : "plus"} size={15} aria-hidden="true" />
        {added ? `Parada ${stopNumber}` : "Sumar"}
      </button>
    </li>
  );
});
