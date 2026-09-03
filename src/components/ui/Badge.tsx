import type { HTMLAttributes } from "react";

import styles from "./primitives.module.css";

export type BadgeVariant =
  | "ai"
  | "cost"
  | "rating"
  | "success"
  | "tag"
  | "warn"
  | "dark";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  ai: styles.badgeAi,
  cost: styles.badgeCost,
  rating: styles.badgeRating,
  success: styles.badgeSuccess,
  tag: styles.badgeTag,
  warn: styles.badgeWarn,
  dark: styles.badgeDark,
};

export function Badge({
  variant = "tag",
  className,
  ...props
}: BadgeProps) {
  const classes = [styles.badge, VARIANT_CLASS[variant], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes} {...props} />;
}
