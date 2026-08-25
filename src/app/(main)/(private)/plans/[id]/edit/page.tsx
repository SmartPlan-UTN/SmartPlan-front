import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EditPlanForm } from "@/components/plan";
import { Icon } from "@/components/ui";
import { parsePositiveIntId } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

import styles from "../../plans.module.css";

export const metadata: Metadata = {
  title: "Editar plan",
};

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const planId = parsePositiveIntId(id);
  if (planId == null) {
    notFound();
  }

  return (
    <section className={styles.screen} aria-labelledby="edit-plan-title">
      <header className={styles.header}>
        <Link href={ROUTES.plans} className={styles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Mis planes
        </Link>
        <p className={`sp-label ${styles.eyebrow}`}>Editar</p>
        <h1 id="edit-plan-title" className="sp-h2">
          Editar plan
        </h1>
        <p className={`sp-body ${styles.lead}`}>
          Cambiá los datos del plan o ajustá su itinerario. Las paradas se
          guardan apenas las agregás o las quitás.
        </p>
      </header>

      <EditPlanForm planId={planId} />
    </section>
  );
}
