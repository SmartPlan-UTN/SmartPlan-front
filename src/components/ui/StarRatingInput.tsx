"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import styles from "./star-rating-input.module.css";

export interface StarRatingInputProps {
  /** 0 means nothing selected yet — never rendered as fully empty stars
   * mid-interaction, since `hovered` takes over while the pointer is over
   * the row. */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: number;
  /** Accessible name for the group, e.g. "Tu puntaje". */
  label: string;
}

const SCORES = [1, 2, 3, 4, 5] as const;

/**
 * Interactive 1-5 star picker for CU44's rating form. No mockup reference
 * exists for this control — `Security.jsx`'s sibling `Stars` display is
 * read-only — so this is original, built from the same `--gold`/`--gold-22`
 * tokens and `Star` icon `Stars` already uses, just as a row of toggle
 * buttons instead of a fixed-fill `role="img"`.
 *
 * Plain buttons with `aria-pressed`, not a `radiogroup`: five individually
 * tabbable, individually labeled controls ("1 estrella" … "5 estrellas")
 * are already fully keyboard-operable without a roving-tabindex
 * implementation a true radio group would need for correctness.
 */
export function StarRatingInput({
  value,
  onChange,
  disabled,
  size = 28,
  label,
}: StarRatingInputProps) {
  const [hovered, setHovered] = useState(0);
  const displayed = hovered || value;

  return (
    <div
      className={styles.group}
      role="group"
      aria-label={label}
      onMouseLeave={() => {
        setHovered(0);
      }}
    >
      {SCORES.map((score) => {
        const filled = score <= displayed;
        return (
          <button
            key={score}
            type="button"
            className={styles.star}
            style={{ width: size, height: size }}
            aria-pressed={score === value}
            aria-label={`${score} ${score === 1 ? "estrella" : "estrellas"}`}
            disabled={disabled}
            onMouseEnter={() => {
              setHovered(score);
            }}
            onFocus={() => {
              setHovered(score);
            }}
            onBlur={() => {
              setHovered(0);
            }}
            onClick={() => {
              onChange(score);
            }}
          >
            <Star
              size={size}
              strokeWidth={2}
              className={filled ? styles.starFilled : styles.starEmpty}
            />
          </button>
        );
      })}
    </div>
  );
}
