"use client";

import Link from "next/link";

import { Icon, LoadingDots } from "@/components/ui";
import { useDetailFetch } from "@/hooks";
import { getOwnPlan } from "@/lib/api";
import { planDetailRoute, ROUTES } from "@/lib/routes";
import type { OwnPlanDetail } from "@/types";

import { PlanComposer } from "./PlanComposer";
import activityStyles from "../activity/activity.module.css";

export interface EditPlanFormProps {
  planId: number;
}

const LOAD_ERROR = "No pudimos cargar el plan para edición. Intentá de nuevo.";

/** Loads an owned plan then hands it to the same composer used for creation. */
export function EditPlanForm({ planId }: EditPlanFormProps) {
  const result = useDetailFetch<OwnPlanDetail>(getOwnPlan, planId, LOAD_ERROR);

  if (result.status === "loading") {
    return (
      <div className={activityStyles.stateBlock}>
        <LoadingDots label="Cargando el plan…" />
      </div>
    );
  }

  if (result.status === "not-found") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
        <h2 className="sp-h3">No encontramos este plan</h2>
        <p className="sp-body">
          Puede haber sido eliminado o no pertenecer a tu cuenta.
        </p>
        <Link href={ROUTES.plans} className={activityStyles.backLink}>
          Volver a Mis planes
        </Link>
      </div>
    );
  }

  if (result.status === "error" || !result.data) {
    return (
      <div className={activityStyles.stateBlock} role="alert">
        <Icon
          name="triangle-alert"
          size={32}
          className={activityStyles.errorIcon}
        />
        <h2 className="sp-h3">No pudimos abrir el editor</h2>
        <p className="sp-body">{result.errorMessage ?? LOAD_ERROR}</p>
        <Link
          href={planDetailRoute(planId)}
          className={activityStyles.backLink}
        >
          Volver al plan
        </Link>
      </div>
    );
  }

  if (result.data.status.key === "cancelled") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon
          name="triangle-alert"
          size={32}
          className={activityStyles.stateIcon}
        />
        <h2 className="sp-h3">El plan se encuentra cancelado</h2>
        <p className="sp-body">
          Este plan fue cancelado y se conserva solo como historial de lectura.
        </p>
        <Link
          href={planDetailRoute(planId)}
          className={activityStyles.backLink}
        >
          Volver al plan
        </Link>
      </div>
    );
  }

  return <PlanComposer mode="edit" plan={result.data} />;
}
