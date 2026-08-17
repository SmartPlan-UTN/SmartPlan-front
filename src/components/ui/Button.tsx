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

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  ghostLight: styles.buttonGhostLight,
  ghostEmber: styles.buttonGhostEmber,
  ai: styles.buttonAi,
  danger: styles.buttonDanger,
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: styles.buttonSm,
  md: styles.buttonMd,
  lg: styles.buttonLg,
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classes} {...props} />;
}
