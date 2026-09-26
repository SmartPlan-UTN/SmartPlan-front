import Link from "next/link";
import type { Metadata } from "next";

import { Icon, Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import styles from "./not-found.module.css";

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
    <div className={styles.screen}>
      <div className={styles.content}>
        <Logo
          variant="ink"
          kind="full"
          height={28}
          priority
          className={styles.logo}
        />

        <section className={styles.card} aria-labelledby="not-found-title">
          <div className={styles.iconFrame} aria-hidden="true">
            <Icon name="route" size={30} />
          </div>
          <p className={`sp-label ${styles.eyebrow}`}>Error 404</p>
          <h1 id="not-found-title" className={`sp-h2 ${styles.title}`}>
            Esta página no existe
          </h1>
          <p className={`sp-body ${styles.description}`}>
            Puede que el enlace esté viejo o que la dirección tenga un error.
          </p>
          <Link href={ROUTES.home} className={styles.homeLink}>
            <Icon name="house" size={17} aria-hidden="true" />
            Volver al inicio
          </Link>
        </section>
      </div>
    </div>
  );
}
