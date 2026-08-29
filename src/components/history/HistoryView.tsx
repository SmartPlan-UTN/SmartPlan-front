"use client";

import { useCallback, useState } from "react";

import { Button, Icon } from "@/components/ui";
import { useMyPlans } from "@/hooks";
import type { PlanFeedback } from "@/types";

import { HistoryPlanCard } from "./HistoryPlanCard";
import styles from "./history.module.css";

const SKELETON_KEYS = ["a", "b", "c", "d"];

/**
 * PAN 13 — the signed-in user's plan history (CU23). A personal record:
 * finished plans carry a feedback layer (an invite while it's `available`,
 * a rated line once `submitted`), everything else reads as an ordinary
 * saved plan.
 */
export function HistoryView() {
  const {
    plans,
    status,
    errorMessage,
    hasResults,
    page,
    totalPages,
    goToPage,
    retry,
    patchPlan,
  } = useMyPlans();

  // "Ahora no" — session only, never persisted (US18 defines no dismissal).
  const [dismissedInvites, setDismissedInvites] = useState<Set<number>>(
    () => new Set()
  );

  const dismissInvite = useCallback((planId: number) => {
    setDismissedInvites((current) => new Set(current).add(planId));
  }, []);

  const handleSubmitted = useCallback(
    (planId: number, feedback: PlanFeedback) => {
      patchPlan(planId, { feedbackState: "submitted", feedback });
    },
    [patchPlan]
  );

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={`sp-h2 ${styles.title}`}>Historial</h1>
        <p className={`sp-body ${styles.subtitle}`}>
          Tus planes, con su estado y la experiencia que registraste en cada
          uno.
        </p>
      </header>

      {status === "loading" && !hasResults ? (
        <div className={styles.list} aria-hidden="true">
          {SKELETON_KEYS.map((key) => (
            <div key={key} className={styles.skeleton} />
          ))}
        </div>
      ) : status === "error" && !hasResults ? (
        <div className={styles.state} role="alert">
          <Icon
            name="triangle-alert"
            size={30}
            className={styles.stateIcon}
          />
          <p className="sp-body">
            {errorMessage ?? "No pudimos cargar tu historial."}
          </p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Reintentar
          </Button>
        </div>
      ) : !hasResults ? (
        <div className={styles.state}>
          <Icon name="inbox" size={30} className={styles.stateIcon} />
          <p className="sp-body">Tus planes guardados aparecerán acá.</p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {plans.map((plan) => (
              <HistoryPlanCard
                key={plan.id}
                plan={plan}
                inviteDismissed={dismissedInvites.has(plan.id)}
                onDismissInvite={() => dismissInvite(plan.id)}
                onSubmitted={handleSubmitted}
                onReconcile={retry}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Paginación del historial">
              <button
                type="button"
                className={styles.pageArrow}
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Página anterior"
              >
                <Icon name="chevron-left" size={16} aria-hidden="true" />
              </button>
              <span className={styles.pageIndicator}>
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className={styles.pageArrow}
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Página siguiente"
              >
                <Icon name="chevron-right" size={16} aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
