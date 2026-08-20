import type { ReactNode } from "react";

import { Navbar } from "./Navbar";
import styles from "./layout.module.css";

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Cáscara de las pantallas con navbar: link de salto, navbar y `<main>`.
 *
 * La usan el layout de `(main)` y el de `admin`. El link de salto va primero
 * en el order de tabulación para no obligar a recorrer la navegación entera en
 * cada pantalla.
 *
 * El `<main>` no impone ancho: las pantallas que no van a fondo completo se
 * envuelven en `Container`.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <a href="#contenido" className={styles.saltarContenido}>
        Saltar al contenido
      </a>

      <Navbar />

      <main id="contenido" className={styles.contenido}>
        {children}
      </main>
    </>
  );
}
