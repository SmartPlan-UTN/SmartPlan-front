import type { HTMLAttributes } from "react";

import styles from "./primitives.module.css";

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  dark?: boolean;
}

export function Divider({
  dark = false,
  className,
  ...props
}: DividerProps) {
  const classes = [styles.divider, dark ? styles.dividerDark : undefined, className]
    .filter(Boolean)
    .join(" ");

  return <hr className={classes} {...props} />;
}
