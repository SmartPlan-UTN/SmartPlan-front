import type { CSSProperties } from "react";

import { Icon } from "@/components/ui";

import type { CategoryPresentation } from "./categoryPresentation";
import styles from "./preferences.module.css";

interface InterestTileProps {
  categoryId: number;
  presentation: CategoryPresentation;
  selected: boolean;
  disabled: boolean;
  index: number;
  onToggle: (categoryId: number) => void;
}

export function InterestTile({
  categoryId,
  presentation,
  selected,
  disabled,
  index,
  onToggle,
}: InterestTileProps) {
  const descriptionId = presentation.description
    ? `interest-${categoryId}-description`
    : undefined;

  return (
    <button
      type="button"
      className={
        selected
          ? `${styles.interestTile} ${styles.interestTileSelected}`
          : styles.interestTile
      }
      aria-label={presentation.label}
      aria-pressed={selected}
      aria-describedby={descriptionId}
      disabled={disabled}
      onClick={() => onToggle(categoryId)}
      style={{ "--item-index": index } as CSSProperties}
    >
      <span className={styles.interestIcon} aria-hidden="true">
        <Icon name={presentation.iconName} size={26} stroke={1.8} />
      </span>
      <span className={styles.interestLabel}>{presentation.label}</span>
      <span className={styles.interestCheck} aria-hidden="true">
        <Icon name="check" size={16} stroke={2.6} />
      </span>
      {presentation.description ? (
        <span className={styles.srOnly} id={descriptionId}>
          {presentation.description}
        </span>
      ) : null}
    </button>
  );
}
