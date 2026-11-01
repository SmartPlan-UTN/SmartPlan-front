import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageKicker, Screen } from "@/components/layout";
import { MyPlansWorkspace } from "@/components/plan";
import { Icon, LoadingDots } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import styles from "./plans.module.css";

export const metadata: Metadata = {
  title: "Mis planes",
};

export default function MyPlansPage() {
  return (
    <Screen labelledBy="my-plans-title">
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div className="sp-page-intro">
            <PageKicker>Tus ideas y tus planes</PageKicker>
            <h1 id="my-plans-title" className="sp-page-title">
              Mis <span className="sp-page-title-accent">planes</span>
            </h1>
            <p className="sp-page-lead">
              Los planes que creaste y las ideas que generamos para vos. Los que
              elegiste hacer están en Mis salidas.
            </p>
          </div>
          <Link href={ROUTES.createPlan} className={styles.createButton}>
            <Icon name="plus" size={16} aria-hidden="true" />
            Crear un plan
          </Link>
        </div>
      </header>

      <Suspense fallback={<LoadingDots label="Cargando tus planes..." />}>
        <MyPlansWorkspace />
      </Suspense>
    </Screen>
  );
}
