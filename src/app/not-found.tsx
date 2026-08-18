import Link from "next/link";
import type { Metadata } from "next";

import styles from "@/components/layout/layout.module.css";
import { Logo } from "@/components/ui";
import { RUTAS } from "@/lib/rutas";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * 404 de toda la aplicación.
 *
 * Va sin navbar: si alguien llegó a una URL que no existe, lo único útil es
 * volver al inicio.
 */
export default function NoEncontrada() {
  return (
    <div className={styles.pantallaCentrada}>
      <Logo variant="white" kind="mark" height={48} />

      <div className={styles.tarjetaCentrada}>
        <h1 className="sp-h3">Esta página no existe</h1>
        <p className={`sp-body ${styles.notaPendienteOscura}`}>
          Puede que el enlace esté viejo o que la dirección tenga un error.
        </p>
        <p>
          <Link href={RUTAS.inicio} className={styles.enlaceBoton}>
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
