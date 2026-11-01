import { Stars } from "@/components/ui";
import type { ExternalRating } from "@/types";

import styles from "./media.module.css";

export interface RatingBadgeProps {
  /** SmartPlan's own average; null/undefined when nobody rated. */
  averageRating?: number | null;
  ratingCount?: number | null;
  /** The place's live Google rating (already filtered by expiry). */
  externalRating?: ExternalRating | null;
  /** Hide the "Sin reseñas" fallback (e.g. where space is tight). */
  hideEmpty?: boolean;
  size?: number;
}

function compactCount(count: number): string {
  if (count >= 1000) {
    const thousands = count / 1000;
    return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(".", ",")} mil`;
  }
  return count.toLocaleString("es-AR");
}

/** Rating and how many people it reflects, for a screen reader. */
export function ratingAccessibleText(props: RatingBadgeProps): string {
  const own =
    props.averageRating != null && (props.ratingCount ?? 0) > 0
      ? props.averageRating
      : null;
  if (own !== null) {
    return `${own.toFixed(1)} de 5 en SmartPlan, ${props.ratingCount} ${props.ratingCount === 1 ? "reseña" : "reseñas"}`;
  }
  if (props.externalRating) {
    return `${props.externalRating.rating.toFixed(1)} de 5 en Google Maps, ${props.externalRating.ratingCount} reseñas`;
  }
  return "Sin reseñas";
}

/**
 * One consistent rating everywhere (cards, map, Quick View, detail):
 * SmartPlan's own rating when people rated it here; otherwise the place's
 * Google rating, always attributed; otherwise "Sin reseñas". Never a
 * meaningless "0.0".
 */
export function RatingBadge(props: RatingBadgeProps) {
  const { averageRating, ratingCount, externalRating, hideEmpty, size = 11 } =
    props;
  const ownCount = ratingCount ?? 0;

  if (averageRating != null && ownCount > 0) {
    return (
      <span className={styles.ratingBadge} title={ratingAccessibleText(props)}>
        <Stars rating={averageRating} size={size} aria-hidden="true" />
        <span aria-hidden="true">
          {averageRating.toFixed(1).replace(".", ",")}
          <span className={styles.ratingBadgeCount}> ({compactCount(ownCount)})</span>
        </span>
        <span className="sp-sr-only">{ratingAccessibleText(props)}</span>
      </span>
    );
  }

  if (externalRating) {
    return (
      <span
        className={styles.ratingBadge}
        title={ratingAccessibleText(props)}
        data-provider="google"
      >
        <span aria-hidden="true" className={styles.ratingBadgeStar}>
          ★
        </span>
        <span aria-hidden="true">
          {externalRating.rating.toFixed(1).replace(".", ",")}
          <span className={styles.ratingBadgeCount}>
            {" "}
            ({compactCount(externalRating.ratingCount)}) · Google
          </span>
        </span>
        <span className="sp-sr-only">{ratingAccessibleText(props)}</span>
      </span>
    );
  }

  if (hideEmpty) return null;
  return <span className={styles.ratingBadgeEmpty}>Sin reseñas</span>;
}
