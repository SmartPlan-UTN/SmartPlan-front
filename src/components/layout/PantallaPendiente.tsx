import type { ReactNode } from "react";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

import styles from "./layout.module.css";

export type TonoPantalla = "claro" | "oscuro";

export interface PantallaPendienteProps {
  titulo: string;
  descripcion: string;
  /** Trazabilidad de la pantalla, por ejemplo `"CU39–CU43 · PAN 12"`. */
  referencias: string;
  /** `oscuro` para las pantallas de sesión, que van sobre superficie `--char`. */
  tono?: TonoPantalla;
  children?: ReactNode;
}

/**
 * Marcador de una pantalla cuya ruta ya existe pero cuyo caso de uso todavía no
 * se implementó.
 *
 * Está para que la navegación de F19 se pueda recorrer entera sin chocar con un
 * 404 y para que quede escrito qué CU la completa. Se borra cuando la última
 * pantalla esté hecha.
 */
export function PantallaPendiente({
  titulo,
  descripcion,
  referencias,
  tono = "claro",
  children,
}: PantallaPendienteProps) {
  const oscuro = tono === "oscuro";

  return (
    <section className={styles.pantallaPendiente}>
      <Badge variant={oscuro ? "dark" : "tag"}>{referencias}</Badge>
      <h1 className="sp-h2">{titulo}</h1>
      <p className="sp-body-lg">{descripcion}</p>
      <p
        className={cn(
          "sp-small",
          oscuro ? styles.notaPendienteOscura : styles.notaPendiente,
        )}
      >
        La pantalla todavía no está implementada. F19 deja la ruta, el layout y la
        navegación listos para que el caso de uso la complete.
      </p>
      {children}
    </section>
  );
}
