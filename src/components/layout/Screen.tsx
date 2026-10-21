import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import styles from "./layout.module.css";

export interface ScreenProps {
  children: ReactNode;
  /** Id of the heading that names the screen, for `aria-labelledby`. */
  labelledBy: string;
  className?: string;
}

/**
 * A screen inside the app shell: named by its own heading, tall enough to
 * fill the viewport so a short screen doesn't pull the footer up over the
 * wave horizon, and faded in on mount.
 *
 * It carries no background of its own — the root layout's `AppBackground`
 * mounts one for the whole app so the waves survive navigation.
 */
export function Screen({ children, labelledBy, className }: ScreenProps) {
  return (
    <section
      className={cn(styles.screen, className)}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  );
}
