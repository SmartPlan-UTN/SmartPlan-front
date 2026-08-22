import type { ReactNode } from "react";

import { Navbar } from "./Navbar";
import styles from "./layout.module.css";

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Shell for screens with a navbar: skip link, navbar, and `<main>`.
 *
 * Used by the `(main)` layout and the `admin` one. The skip link comes
 * first in tab order so users don't have to tab through the entire
 * navigation on every screen.
 *
 * The `<main>` does not constrain width: screens that don't go full-bleed
 * wrap themselves in `Container`.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <a href="#content" className={styles.skipLink}>
        Saltar al contenido
      </a>

      <Navbar />

      <main id="content" className={styles.content}>
        {children}
      </main>
    </>
  );
}
