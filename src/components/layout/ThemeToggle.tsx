"use client";

import { Icon } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

import styles from "./theme-toggle.module.css";

export interface ThemeToggleProps {
  className?: string;
}

/**
 * The dark-theme switch: a moon, top right, next to the account controls
 * of the navbar and of the administration panel.
 *
 * Rendered only with a session — the dark theme is a choice made once
 * logged in, and anonymous screens stay light. A toggle button rather
 * than a pair of icons: the name stays "Modo oscuro" and `aria-pressed`
 * carries whether it's on, which is also what lights the moon in ember.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, canToggle, toggleTheme } = useTheme();

  if (!canToggle) return null;

  const dark = theme === "dark";

  return (
    <button
      type="button"
      className={cn(styles.toggle, className)}
      aria-label="Modo oscuro"
      aria-pressed={dark}
      title={dark ? "Desactivar modo oscuro" : "Activar modo oscuro"}
      onClick={toggleTheme}
    >
      <Icon name="moon" size={19} className={styles.icon} />
    </button>
  );
}
