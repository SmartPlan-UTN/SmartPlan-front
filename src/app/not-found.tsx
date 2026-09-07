import Link from "next/link";
import type { Metadata } from "next";

import styles from "@/components/layout/layout.module.css";
import { Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * 404 for the whole application.
 *
 * Renders without the navbar: if someone lands on a URL that doesn't exist,
 * the only useful action is going back home.
 */
export default function NotFoundPage() {
  return (
    <div className={styles.centeredScreen}>
      <Logo variant="white" kind="mark" height={48} />

      <div className={styles.centeredCard}>
        <h1 className="sp-h3">Esta página no existe</h1>
        <p className={`sp-body ${styles.pendingNoteDark}`}>
          Puede que el enlace esté viejo o que la dirección tenga un error.
        </p>
        <p>
          <Link href={ROUTES.home} className={styles.buttonLink}>
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
