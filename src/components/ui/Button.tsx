import type { ButtonHTMLAttributes } from "react";

import styles from "./primitives.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "ghostLight"
  | "ghostEmber"
  | "ai"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[`buttonVariant${variant}`],
    styles[`buttonSize${size}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classes} {...props} />;
}
