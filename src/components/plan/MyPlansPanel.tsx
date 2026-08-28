"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge, Button, ConfirmationDialog, Icon, LoadingDots } from "@/components/ui";
import { ApiError, cancelOwnPlan, listOwnPlans } from "@/lib/api";
import { planDetailRoute, planEditRoute, ROUTES } from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
import type { OwnPlanSummary } from "@/types";

import styles from "./MyPlansPanel.module.css";

type LoadStatus = "loading" | "idle" | "error";

/**
 * The user's own plans (CU29), with the create-plan entry point as the
 * first cell of the grid — same shape as `CollectionsPanel`, so both
 * private listings read alike.
 *
 * Cancelling (CU26) is offered here as well as on PAN 17: this is the
 * screen someone lands on to manage what they made, and bouncing through
 * the detail view just to cancel is a detour. A cancelled plan stays in
 * the list as read-only history — that's the point of the logical delete —
 * so it keeps its card and loses its actions.
 */
export function MyPlansPanel() {
  const [plans, setPlans] = useState<OwnPlanSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadSequence, setReloadSequence] = useState(0);
  const [pendingDeletion, setPendingDeletion] =
    useState<OwnPlanSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAutoPlanModal, setShowAutoPlanModal] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setStatus("loading");
      try {
        const result = await listOwnPlans({
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          direction: "desc",
        });
        if (ignore) return;
        setPlans(
          result.data.filter((plan) => plan.status?.key !== "cancelled"),
        );
        setStatus("idle");
      } catch (_error) {
        if (!ignore) setStatus("error");
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [reloadSequence]);

  function requestDeletion(plan: OwnPlanSummary) {
    setNotice(null);
    setDeleteError(null);
    setPendingDeletion(plan);
  }

  async function deletePendingPlan() {
    if (!pendingDeletion) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await cancelOwnPlan(pendingDeletion.id);
      // Eliminated plan is removed from the active list view
      setPlans((current) =>
        current.filter((plan) => plan.id !== pendingDeletion.id),
      );
      setPendingDeletion(null);
      setNotice("Plan eliminado correctamente");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No pudimos eliminar el plan. Intentá nuevamente";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {notice ? (
        <p className={styles.notice} role="status">
          <Icon name="circle-check" size={18} />
          {notice}
        </p>
      ) : null}

      <div className={styles.grid} aria-busy={status === "loading"}>
        <Link className={styles.createCard} href={ROUTES.createPlan}>
          <span className={styles.createIcon} aria-hidden="true">
            <Icon name="plus" size={22} />
          </span>
          <span>Crear un plan nuevo</span>
          <span className={styles.createHint}>
            Armá el itinerario y sumale actividades
          </span>
        </Link>

        <button
          type="button"
          className={styles.createCard}
          onClick={() => setShowAutoPlanModal(true)}
        >
          <span className={styles.createIcon} aria-hidden="true">
            <Icon name="sparkles" size={22} />
          </span>
          <span>Generar plan automático</span>
          <span className={styles.createHint}>
            Itinerario sugerido con IA
          </span>
        </button>

        {status === "loading" ? (
          <LoadingDots
            className={styles.loadingRow}
            label="Cargando tus planes..."
          />
        ) : null}

        {status === "error" ? (
          <div className={styles.stateCard} role="alert">
            <Icon name="triangle-alert" />
            <p>No pudimos cargar tus planes.</p>
            <Button
              variant="ghostLight"
              size="sm"
              onClick={() => setReloadSequence((current) => current + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : null}

        {status === "idle" && plans.length === 0 ? (
          <div className={styles.stateCard}>
            <Icon name="route" size={28} />
            <p>
              Todavía no armaste ningún plan. Empezá por el primero y sumale las
              actividades que quieras.
            </p>
          </div>
        ) : null}

        {status === "idle"
          ? plans.map((plan) => {
              const isCancelled = plan.status?.key === "cancelled";

              return (
                <article
                  key={plan.id}
                  className={[
                    styles.planCard,
                    isCancelled ? styles.cancelledCard : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <Link
                        href={planDetailRoute(plan.id)}
                        className={styles.cardTitleLink}
                      >
                        {plan.title}
                      </Link>
                    </h2>

                    {isCancelled ? (
                      <Badge variant="warn">Eliminado</Badge>
                    ) : (
                      <div className={styles.cardActions}>
                        <Link
                          className={styles.iconAction}
                          href={planEditRoute(plan.id)}
                          aria-label={`Editar ${plan.title}`}
                        >
                          <Icon name="pencil" size={16} />
                        </Link>
                        <button
                          type="button"
                          className={`${styles.iconAction} ${styles.deleteAction}`}
                          onClick={() => requestDeletion(plan)}
                          aria-label={`Eliminar ${plan.title}`}
                        >
                          <Icon name="trash-2" size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {plan.description ? (
                    <p className={styles.description}>{plan.description}</p>
                  ) : null}

                  <div className={styles.metaRow}>
                    <span className={styles.metaItem}>
                      <Icon name="route" size={14} />
                      {plan.activityCount === 1
                        ? "1 actividad"
                        : `${plan.activityCount} actividades`}
                    </span>
                    <span className={styles.metaItem}>
                      <Icon name="clock" size={14} />
                      {formatDuration(plan.estimatedTotalDuration)}
                    </span>
                    <span className={styles.metaItem}>
                      <Icon name="users" size={14} />
                      {plan.peopleCount === 1
                        ? "1 persona"
                        : `${plan.peopleCount} personas`}
                    </span>
                    <span className={`${styles.metaItem} ${styles.cost}`}>
                      <Icon name="wallet" size={14} />
                      {formatArs(plan.estimatedTotalCost)}
                    </span>
                  </div>
                </article>
              );
            })
          : null}
      </div>

      {pendingDeletion ? (
        <ConfirmationDialog
          title={`¿Eliminar “${pendingDeletion.title}”?`}
          confirmLabel="Sí, eliminar plan"
          confirmingLabel="Eliminando..."
          cancelLabel="Volver"
          isConfirming={isDeleting}
          error={deleteError}
          onCancel={() => setPendingDeletion(null)}
          onConfirm={() => void deletePendingPlan()}
        >
          <p>
            El plan se eliminará de tus planes y ya no estará disponible en tu lista.
          </p>
        </ConfirmationDialog>
      ) : null}

      {/* Auto Plan Generation - Módulo en construcción Modal (CU31) */}
      {showAutoPlanModal && (
        <ConfirmationDialog
          title="Módulo en construcción"
          confirmLabel="Entendido, crear manualmente"
          cancelLabel=""
          onCancel={() => setShowAutoPlanModal(false)}
          onConfirm={() => setShowAutoPlanModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", textAlign: "center" }}>
            <Icon name="sparkles" size={36} style={{ color: "var(--ember)" }} />
            <p>
              La <strong>generación automática de itinerarios con Inteligencia Artificial</strong> (CU31) se encuentra actualmente en desarrollo.
            </p>
            <p style={{ fontSize: "var(--t-small)", color: "var(--fg-3)" }}>
              Estará disponible próximamente en SmartPlan. Por el momento podés armar tu plan de forma personalizada agregando las actividades manualmente.
            </p>
          </div>
        </ConfirmationDialog>
      )}
    </>
  );
}
