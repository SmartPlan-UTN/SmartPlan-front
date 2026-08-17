import type { ButtonHTMLAttributes } from "react";

import styles from "./primitives.module.css";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  dark?: boolean;
}

export function Chip({
  active = false,
  dark = false,
  type = "button",
  className,
  ...props
}: ChipProps) {
  const classes = [
    styles.chip,
    active ? styles.chipActive : undefined,
    dark && !active ? styles.chipDark : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // aria-pressed va antes del spread para que un chip que no alterna estado
  // (por ejemplo, uno que navega) pueda quitarlo con aria-pressed={undefined}.
  return (
    <button type={type} className={classes} aria-pressed={active} {...props} />
  );
}
