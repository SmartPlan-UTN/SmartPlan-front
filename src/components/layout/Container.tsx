import type { ReactNode } from "react";

import styles from "./layout.module.css";

export interface ContainerProps {
  children: ReactNode;
}

/**
 * Centers content at the 1200px max width (`--max-w`) with the vertical
 * section spacing (`--section-v`).
 *
 * Deliberately not part of the layout: some screens go full-bleed —the home
 * hero with `MoodBackground`, the plan-generation waiting screen— and a
 * container imposed from above would force them to fight it. The layout
 * provides the navbar; the screen decides its own width.
 */
export function Container({ children }: ContainerProps) {
  return <div className={styles.container}>{children}</div>;
}
