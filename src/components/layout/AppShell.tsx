import type { ReactNode } from "react";

import { AppBackground } from "./AppBackground";
import { Navbar } from "./Navbar";
import styles from "./layout.module.css";

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Shell for screens with a navbar: skip link, navbar, wave background, and
 * `<main>`.
 *
 * Used by the `(main)` layout and the `admin` one. The skip link comes
 * first in tab order so users don't have to tab through the entire
 * navigation on every screen.
 *
 * The `<main>` does not constrain width: screens that don't go full-bleed
 * wrap themselves in `Container`.
 *
 * The background is mounted here, once, so it keeps animating across
 * navigations — see `AppBackground`. Screens don't mount their own.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <a href="#content" className={styles.skipLink}>
        Saltar al contenido
      </a>

      <Navbar />
      <AppBackground />

      <main id="content" className={styles.content}>
        {children}
      </main>
    </>
  );
}
