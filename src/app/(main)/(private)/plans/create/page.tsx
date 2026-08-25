import type { Metadata } from "next";
import Link from "next/link";

import { CreatePlanForm } from "@/components/plan";
import { Icon } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import styles from "../plans.module.css";

export const metadata: Metadata = {
  title: "Crear plan",
};

export default function CreatePlanPage() {
  return (
    <section className={styles.screen} aria-labelledby="create-plan-title">
      <header className={styles.header}>
        <Link href={ROUTES.plans} className={styles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Mis planes
        </Link>
        <p className={`sp-label ${styles.eyebrow}`}>Nuevo plan</p>
        <h1 id="create-plan-title" className="sp-h2">
          Crear plan
        </h1>
        <p className={`sp-body ${styles.lead}`}>
          Ponele nombre, decidí para cuántas personas es y sumale las
          actividades. Se guarda todo junto al confirmar.
        </p>
      </header>

      <CreatePlanForm />
    </section>
  );
}
