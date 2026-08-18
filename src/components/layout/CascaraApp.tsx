import type { ReactNode } from "react";

import { Navbar } from "./Navbar";
import styles from "./layout.module.css";

export interface CascaraAppProps {
  children: ReactNode;
}

/**
 * Cáscara de las pantallas con navbar: enlace de salto, barra y `<main>`.
 *
 * La usan el layout de `(main)` y el de `admin`. El enlace de salto va primero
 * en el orden de tabulación para no obligar a recorrer la navegación entera en
 * cada pantalla.
 *
 * El `<main>` no impone ancho: las pantallas que no van a fondo completo se
 * envuelven en `Contenedor`.
 */
export function CascaraApp({ children }: CascaraAppProps) {
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
