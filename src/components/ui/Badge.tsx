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

export function Badge({
  variant = "tag",
  className,
  ...props
}: BadgeProps) {
  const classes = [styles.badge, styles[`badgeVariant${variant}`], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes} {...props} />;
}
