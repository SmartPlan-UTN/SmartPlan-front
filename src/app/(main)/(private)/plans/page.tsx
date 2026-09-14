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
            <p className="sp-label sp-page-kicker">Tus recorridos</p>
            <h1 id="my-plans-title" className="sp-page-title">
              Mis <span className="sp-page-title-accent">planes</span>
            </h1>
            <p className="sp-page-lead">
              Los planes que armaste, con su itinerario, su duración y lo que
              sale cada uno.
            </p>
          </div>
          <Link href={ROUTES.createPlan} className={styles.createButton}>
            <Icon name="plus" size={16} aria-hidden="true" />
            Crear plan
          </Link>
        </div>
      </header>

      <MyPlansPanel />
    </Screen>
  );
}
