import type { Metadata } from "next";
import Link from "next/link";

import { Screen } from "@/components/layout";
import { CreatePlanForm } from "@/components/plan";
import { Icon } from "@/components/ui";
import { activityDetailRoute, ROUTES } from "@/lib/routes";
import { parsePositiveIntId } from "@/lib/utils";

import styles from "../plans.module.css";

export const metadata: Metadata = {
  title: "Crear un plan",
};

export default async function CreatePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ activityId?: string; source?: string }>;
}) {
  const query = await searchParams;
  const initialActivityId = parsePositiveIntId(query.activityId ?? "");
  const returnToActivity =
    query.source === "activity" && initialActivityId !== null;
  const backHref =
    returnToActivity && initialActivityId
      ? activityDetailRoute(initialActivityId)
      : ROUTES.plans;

  return (
    <Screen labelledBy="create-plan-title">
      <header className={styles.composerHeader}>
        <Link href={backHref} className={styles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          {returnToActivity ? "Volver a la actividad" : "Mis planes"}
        </Link>
        <span aria-hidden="true">/</span>
        <h1 id="create-plan-title" className={styles.composerTitle}>
          Nuevo plan
        </h1>
      </header>

      <CreatePlanForm
        initialActivityId={initialActivityId ?? undefined}
        returnToActivity={returnToActivity}
      />
    </Screen>
  );
}
