import Link from "next/link";
import type { ReactNode } from "react";

import styles from "@/components/layout/layout.module.css";
import { Logo } from "@/components/ui";
import { RUTAS } from "@/lib/rutas";

/**
 * Layout de las pantallas de sesión: login, registro y recuperar contraseña.
 *
 * Va sin navbar y sobre superficie oscura con `blur`, como el diseño de EMBER.
 * Quien todavía no inició sesión no tiene a dónde navegar dentro de la
 * aplicación; lo único que necesita es volver al inicio.
 */
export default function LayoutAuth({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.pantallaCentrada}>
      <Link href={RUTAS.inicio} className={styles.marca}>
        <Logo variant="white" kind="full" height={28} priority />
      </Link>

      <div className={styles.tarjetaCentrada}>{children}</div>
    </div>
  );
}
