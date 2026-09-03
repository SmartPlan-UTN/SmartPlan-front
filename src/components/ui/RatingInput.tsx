"use client";

import { Star } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import styles from "./primitives.module.css";

export interface RatingInputProps {
  /** Current rating, 1–5. `0` means nothing chosen yet. */
  value: number;
  onChange: (value: number) => void;
  /** Accessible label per star, indexed 1–5. */
  labels?: readonly [string, string, string, string, string];
  /** Star edge in px. Touch targets stay ≥ 44px regardless. */
  size?: number;
  /** id of the visible group label, wired as `aria-labelledby`. */
  labelledBy?: string;
  disabled?: boolean;
  /** Fires as the pointer/keyboard previews a value (for live copy). */
  onPreview?: (value: number) => void;
}

const STARS = [1, 2, 3, 4, 5] as const;

const DEFAULT_LABELS = [
  "1 estrella",
  "2 estrellas",
  "3 estrellas",
  "4 estrellas",
  "5 estrellas",
] as const;

/**
 * The star rating control for CU23 — the one required field. A
 * `radiogroup` of five buttons: full keyboard support (arrows, 1–5,
 * Home/End), hover preview on pointer devices, a settle micro-animation on
 * pick, and ≥ 44px touch targets. Reuses the display fill language of
 * `Stars`.
 */
export function RatingInput({
  value,
  onChange,
  labels = DEFAULT_LABELS,
  size = 40,
  labelledBy,
  disabled = false,
  onPreview,
}: RatingInputProps) {
  const [hovered, setHovered] = useState(0);
  const [justPicked, setJustPicked] = useState(0);
  const groupId = useId();
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const shown = hovered || value;

  function preview(next: number) {
    setHovered(next);
    onPreview?.(next);
  }

  function clearPreview() {
    setHovered(0);
    onPreview?.(value);
  }

  function pick(next: number, moveFocus = false) {
    if (disabled) return;
    onChange(next);
    setJustPicked(next);
    onPreview?.(next);
    if (moveFocus) starRefs.current[next - 1]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const current = value || 0;
    let next: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = Math.min(5, current + 1) || 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = Math.max(1, current - 1);
    } else if (event.key === "Home") {
      next = 1;
    } else if (event.key === "End") {
      next = 5;
    } else if (/^[1-5]$/.test(event.key)) {
      next = Number(event.key);
    }

    if (next !== null) {
      event.preventDefault();
      pick(next, true);
    }
  }

  return (
    <div
      className={styles.ratingInput}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-required="true"
      onKeyDown={onKeyDown}
      onMouseLeave={clearPreview}
    >
      {STARS.map((star) => {
        const active = shown >= star;
        return (
          <button
            key={star}
            ref={(node) => {
              starRefs.current[star - 1] = node;
            }}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={labels[star - 1] ?? DEFAULT_LABELS[star - 1]}
            id={`${groupId}-${star}`}
            tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
            className={styles.ratingStar}
            disabled={disabled}
            onMouseEnter={() => preview(star)}
            onFocus={() => preview(star)}
            onBlur={clearPreview}
            onClick={() => pick(star)}
            onAnimationEnd={() => setJustPicked(0)}
          >
            <Star
              size={size}
              strokeWidth={1.75}
              className={[
                styles.ratingStarIcon,
                active ? styles.ratingStarIconOn : "",
                justPicked === star ? styles.ratingStarIconPicked : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}
