import { Star } from "lucide-react";
import type { HTMLAttributes } from "react";

import styles from "./primitives.module.css";

export interface StarsProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  rating: number;
  size?: number;
}

const STAR_COUNT = 5;

export function Stars({
  rating,
  size = 12,
  className,
  "aria-label": ariaLabel,
  ...props
}: StarsProps) {
  const safeRating = Number.isFinite(rating)
    ? Math.min(STAR_COUNT, Math.max(0, rating))
    : 0;
  const roundedRating = Math.round(safeRating * 2) / 2;
  const classes = [styles.stars, className].filter(Boolean).join(" ");

  // If the consumer already points to an external label via aria-labelledby,
  // don't generate an aria-label: two competing labels leave one unused.
  const label =
    ariaLabel ??
    (props["aria-labelledby"] != null
      ? undefined
      : `${roundedRating} de ${STAR_COUNT} estrellas`);

  return (
    <span className={classes} role="img" aria-label={label} {...props}>
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const fill = Math.min(1, Math.max(0, roundedRating - index));

        return (
          <span
            className={styles.star}
            style={{ width: size, height: size }}
            aria-hidden="true"
            key={index}
          >
            <Star className={styles.starEmpty} size={size} strokeWidth={2} />
            {fill > 0 ? (
              <span
                className={styles.starFillClip}
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={styles.starFilled}
                  size={size}
                  strokeWidth={2}
                />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
