"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Pagination } from "@/components/explore";
import { Badge, Button, Icon, LoadingDots } from "@/components/ui";
import { copyGeneratedPlan, listGeneratedPlans } from "@/lib/api";
import {
  generatedPlansRoute,
  planDetailRoute,
  planEditRoute,
  ROUTES,
} from "@/lib/routes";
import { formatDuration, formatPlanTotal } from "@/lib/utils";
import type { GeneratedPlanSummary } from "@/types";

import styles from "./MyPlansPanel.module.css";

export function GeneratedPlansPanel({
  page,
  onPageChange,
}: {
  page: number;
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();
  const [plans, setPlans] = useState<GeneratedPlanSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [totalPages, setTotalPages] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copying = useRef(false);

  useEffect(() => {
    let active = true;
    listGeneratedPlans({
      page,
      limit: 12,
      sortBy: "createdAt",
      direction: "desc",
    })
      .then((result) => {
        if (!active) return;
        setPlans(result.data);
        setTotalPages(result.pagination.totalPages);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [page, attempt]);

  async function edit(plan: GeneratedPlanSummary) {
    if (copying.current) return;
    copying.current = true;
    setCopyingId(plan.id);
    setCopyError(null);
    try {
      const copy = await copyGeneratedPlan(plan.id);
      setPlans((current) =>
        current.map((item) =>
          item.id === plan.id ? { ...item, editablePlanId: copy.id } : item,
        ),
      );
      router.push(planEditRoute(copy.id));
    } catch {
      setCopyError(
        "No pudimos abrir la copia editable. Intentá nuevamente; tu plan original sigue guardado.",
      );
    } finally {
      copying.current = false;
      setCopyingId(null);
    }
  }

  return (
    <section aria-label="Historial de planes generados">
      <p className={styles.historyHint}>
        Todas las ideas que generamos para vos. Volvé a abrirlas o editá una
        copia para hacerla tuya y publicarla si querés.
      </p>
      {copyError ? (
        <p className={styles.historyError} role="alert">
          {copyError}
        </p>
      ) : null}
      <div className={styles.grid} aria-busy={status === "loading"}>
        {status === "loading" ? (
          <LoadingDots
            className={styles.loadingRow}
            label="Cargando planes generados..."
          />
        ) : null}
        {status === "error" ? (
          <div className={styles.stateCard} role="alert">
            <Icon name="triangle-alert" />
            <p>No pudimos cargar tu historial.</p>
            <Button
              variant="ghostLight"
              size="sm"
              onClick={() => {
                setStatus("loading");
                setAttempt((value) => value + 1);
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : null}
        {status === "ready" && plans.length === 0 ? (
          <div className={styles.stateCard}>
            <Icon name="sparkles" size={28} />
            <p>
              {page === 1
                ? "Todavía no generaste ningún plan. Contanos qué te gustaría hacer y guardaremos las ideas acá."
                : "No hay planes en esta página."}
            </p>
            <Link
              href={page === 1 ? ROUTES.home : generatedPlansRoute()}
              className={styles.cardTitleLink}
            >
              {page === 1
                ? "Generar un plan"
                : "Volver al inicio del historial"}
            </Link>
          </div>
        ) : null}
        {status === "ready"
          ? plans.map((plan) => (
              <article key={plan.id} className={styles.planCard}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <Link
                      href={planDetailRoute(plan.id, generatedPlansRoute(page))}
                      className={styles.cardTitleLink}
                    >
                      {plan.title}
                    </Link>
                  </h2>
                  <Badge variant="ai">Generado</Badge>
                </div>
                <time className={styles.historyDate} dateTime={plan.createdAt}>
                  {new Date(plan.createdAt).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
                {plan.description ? (
                  <p className={styles.description}>{plan.description}</p>
                ) : null}
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    <Icon name="route" size={14} />
                    {plan.activityCount}{" "}
                    {plan.activityCount === 1 ? "actividad" : "actividades"}
                  </span>
                  <span className={styles.metaItem}>
                    <Icon name="clock" size={14} />
                    {formatDuration(plan.estimatedTotalDuration)}
                  </span>
                  <span className={styles.metaItem}>
                    <Icon name="users" size={14} />
                    {plan.peopleCount}{" "}
                    {plan.peopleCount === 1 ? "persona" : "personas"}
                  </span>
                  <span className={`${styles.metaItem} ${styles.cost}`}>
                    <Icon name="wallet" size={14} />
                    {formatPlanTotal(plan)}
                  </span>
                </div>
                <div className={styles.historyActions}>
                  <Link
                    className={styles.cardTitleLink}
                    href={planDetailRoute(plan.id, generatedPlansRoute(page))}
                  >
                    Volver a abrir
                  </Link>
                  <Button
                    size="sm"
                    variant="ghostEmber"
                    disabled={copyingId !== null}
                    onClick={() => {
                      void edit(plan);
                    }}
                    aria-label={`${plan.editablePlanId ? "Continuar editando" : "Editar una copia de"} ${plan.title}`}
                  >
                    {copyingId === plan.id
                      ? "Abriendo..."
                      : plan.editablePlanId
                        ? "Continuar editando"
                        : "Editar este plan"}
                  </Button>
                  {plan.editablePlanId ? (
                    <Link
                      className={styles.cardTitleLink}
                      href={planDetailRoute(
                        plan.editablePlanId,
                        generatedPlansRoute(page),
                      )}
                    >
                      Ver mi copia
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
          : null}
      </div>
      {status === "ready" ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={copyingId !== null}
        />
      ) : null}
    </section>
  );
}
