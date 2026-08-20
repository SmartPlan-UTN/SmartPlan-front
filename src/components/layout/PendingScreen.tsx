import type { ReactNode } from "react";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

import styles from "./layout.module.css";

export type ScreenTone = "light" | "dark";

export interface PendingScreenProps {
  title: string;
  description: string;
  /** Trazabilidad de la pantalla, por ejemplo `"CU39–CU43 · PAN 12"`. */
  referencias: string;
  /** `dark` para las pantallas de sesión, que van envelope superficie `--char`. */
  tono?: ScreenTone;
  children?: ReactNode;
}

/**
 * Marcador de una pantalla cuya route ya existe pero cuyo caso de uso todavía no
 * se implementó.
 *
 * Está para que la navegación de F19 se pueda recorrer entera sin chocar con un
 * 404 y para que quede escrito qué CU la completa. Se borra cuando la última
 * pantalla esté hecha.
 */
export function PendingScreen({
  title,
  description,
  referencias,
  tono = "light",
  children,
}: PendingScreenProps) {
  const dark = tono === "dark";

  return (
    <section className={styles.pendingScreen}>
      <Badge variant={dark ? "dark" : "tag"}>{referencias}</Badge>
      <h1 className="sp-h2">{title}</h1>
      <p className="sp-body-lg">{description}</p>
      <p
        className={cn(
          "sp-small",
          dark ? styles.notaPendienteOscura : styles.notaPendiente,
        )}
      >
        La pantalla todavía no está implementada. F19 deja la route, el layout y la
        navegación listos para que el caso de uso la complete.
      </p>
      {children}
    </section>
  );
}
