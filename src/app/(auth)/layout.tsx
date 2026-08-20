import Link from "next/link";
import type { ReactNode } from "react";

import styles from "@/components/layout/layout.module.css";
import { Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * Layout de las pantallas de sesión: login, signup y recuperar contraseña.
 *
 * Va sin navbar y envelope superficie oscura con `blur`, como el diseño de EMBER.
 * Quien todavía no inició sesión no tiene a dónde navegar dentro de la
 * aplicación; lo único que necesita es volver al home.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.centeredScreen}>
      <Link href={ROUTES.home} className={styles.marca}>
        <Logo variant="white" kind="full" height={28} priority />
      </Link>

      <div className={styles.centeredCard}>{children}</div>
    </div>
  );
}
