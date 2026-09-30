import type { Metadata } from "next";
import Link from "next/link";

import { Screen } from "@/components/layout";
import { MyPlansPanel } from "@/components/plan";
import { Icon } from "@/components/ui";
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
            <p className="sp-label sp-page-kicker">Lo que creaste</p>
            <h1 id="my-plans-title" className="sp-page-title">
              Mis <span className="sp-page-title-accent">planes</span>
            </h1>
            <p className="sp-page-lead">
              Los planes que creaste vos, privados o públicos. Los que elegiste
              hacer están en Mis salidas.
            </p>
          </div>
          <Link href={ROUTES.createPlan} className={styles.createButton}>
            <Icon name="plus" size={16} aria-hidden="true" />
            Crear un plan
          </Link>
        </div>
      </header>

      <MyPlansPanel />
    </Screen>
  );
}
