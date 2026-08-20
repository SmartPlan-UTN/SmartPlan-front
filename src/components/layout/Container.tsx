import type { ReactNode } from "react";

import styles from "./layout.module.css";

export interface ContainerProps {
  children: ReactNode;
}

/**
 * Centra el contenido en los 1200px de ancho máximo (`--max-w`) con el aire
 * vertical de sección (`--section-v`).
 *
 * No está en el layout a propósito: hay pantallas que van a fondo completo —el
 * hero del home con `MoodBackground`, la espera de la generación de plan— y
 * un container impuesto desde arriba las obligaría a pelearse con él. El
 * layout aporta la navbar; el ancho lo decide la pantalla.
 */
export function Container({ children }: ContainerProps) {
  return <div className={styles.container}>{children}</div>;
}
