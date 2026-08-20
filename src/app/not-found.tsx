import Link from "next/link";
import type { Metadata } from "next";

import styles from "@/components/layout/layout.module.css";
import { Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * 404 de toda la aplicación.
 *
 * Va sin navbar: si alguien llegó a una URL que no existe, lo único útil es
 * volver al home.
 */
export default function NotFoundPage() {
  return (
    <div className={styles.centeredScreen}>
      <Logo variant="white" kind="mark" height={48} />

      <div className={styles.centeredCard}>
        <h1 className="sp-h3">Esta página no existe</h1>
        <p className={`sp-body ${styles.notaPendienteOscura}`}>
          Puede que el link esté viejo o que la dirección tenga un error.
        </p>
        <p>
          <Link href={ROUTES.home} className={styles.buttonLink}>
            Volver al home
          </Link>
        </p>
      </div>
    </div>
  );
}
