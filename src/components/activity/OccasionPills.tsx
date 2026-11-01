import { occasionLabel, sortOccasions } from "@/lib/occasions";

import styles from "./OccasionPills.module.css";

export interface OccasionPillsProps {
  occasions: readonly string[];
  /** Pills shown before collapsing the rest into "+n". */
  max?: number;
  className?: string;
}

/**
 * Who an activity suits and its mood, as full pills (#135). Known keys only,
 * in vocabulary order; the rest of a long list is counted, not hidden behind
 * hover.
 */
export function OccasionPills({ occasions, max, className }: OccasionPillsProps) {
  const known = sortOccasions(occasions);
  if (known.length === 0) return null;
  const visible = max === undefined ? known : known.slice(0, max);
  const hidden = known.length - visible.length;
  const allLabels = known.map((key) => occasionLabel(key)).join(", ");

  return (
    <ul
      className={[styles.pills, className].filter(Boolean).join(" ")}
      aria-label={`Ideal para: ${allLabels}`}
    >
      {visible.map((key) => (
        <li key={key} className={styles.pill}>
          {occasionLabel(key)}
        </li>
      ))}
      {hidden > 0 ? (
        <li className={`${styles.pill} ${styles.more}`} aria-hidden="true">
          +{hidden}
        </li>
      ) : null}
    </ul>
  );
}
