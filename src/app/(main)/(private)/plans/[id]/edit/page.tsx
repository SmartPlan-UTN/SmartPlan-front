import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Screen } from "@/components/layout";
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
    <Screen labelledBy="edit-plan-title">
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
          Cambiá la idea y el recorrido en un solo borrador. Guardamos todo junto cuando confirmes.
        </p>
      </header>

      <EditPlanForm planId={planId} />
    </Screen>
  );
}
