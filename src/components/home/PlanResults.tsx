"use client";

import { useState } from "react";
import Link from "next/link";

import { PLAN_SELECTION } from "@/components/plan/planSelectionContent";
import { Badge, Button, Icon, Stars } from "@/components/ui";
import { usePlanSelection } from "@/hooks";
import { planDetailRoute } from "@/lib/routes";
import { formatArs, formatDuration, gradientFor } from "@/lib/utils";
import type { PlanRequestPlanSummary, PlanSelectionResult } from "@/types";

import styles from "./generation.module.css";
import exploreStyles from "../explore/explore.module.css";

export interface PlanResultsProps {
  plans: PlanRequestPlanSummary[];
  /** Back to the composer with the previous idea loaded, ready to edit. */
  onAdjust: () => void;
  onDiscard: () => void;
  /** Hidden when there is nothing to adjust (a surprise plan has no query). */
  canAdjust?: boolean;
  /** `surprise` swaps the copy and offers "Sorpréndeme de nuevo" (CU19). */
  mode?: "auto" | "surprise";
  /** One-line note under the header (e.g. fallback / no-preferences, CU19). */
  note?: string | null;
  /** Creates a fresh surprise request from the same coordinates (CU19). */
  onRegenerate?: () => void;
  /**
   * A plan's intent changed (CU22): the caller updates the alternatives in
   * place from the backend result — no refetch.
   */
  onPlanSelected?: (result: PlanSelectionResult) => void;
  /**
   * The change was rejected because the request advanced (or the plan is
   * gone). The list here is stale — the caller reconciles it from the server.
   */
  onSelectionReconcile?: () => void;
}

/** CU17 and CU19 both surface at most three alternatives. */
const MAX_VISIBLE_PLANS = 3;

/**
 * Up to 3 generated plans (CU17, CU19), shown as a continuation of the
 * landing hero rather than as a new screen.
 *
 * CU17 asks for three things to be possible on a result: adjust it, discard
 * it, or say you're going to do it. That last one is CU22 — a reversible
 * intent toggle: "Lo voy a hacer" fires `PATCH /plans/:id/select` directly
 * (no modal — the state and the "Ya no lo voy a hacer" control are the safety
 * net); the card then reads "✓ Lo vas a hacer". The others stay exactly as
 * they were, because nothing was rejected — the user just plans to do one.
 */
export function PlanResults({
  plans,
  onAdjust,
  onDiscard,
  canAdjust = true,
  mode = "auto",
  note = null,
  onRegenerate,
  onPlanSelected,
  onSelectionReconcile,
}: PlanResultsProps) {
  const surprise = mode === "surprise";
  const visiblePlans = plans.slice(0, MAX_VISIBLE_PLANS);

  const selection = usePlanSelection();
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [statusNote, setStatusNote] = useState<{
    tone: "ok" | "warn";
    text: string;
  } | null>(null);

  async function toggleIntent(
    plan: PlanRequestPlanSummary,
    direction: "on" | "off",
  ) {
    if (selection.status === "working" || workingId !== null) return;
    setStatusNote(null);
    setWorkingId(plan.id);

    const outcome = await (direction === "on"
      ? selection.select(plan.id)
      : selection.deselect(plan.id));

    setWorkingId(null);
    if (!outcome) return;

    if (outcome.ok) {
      onPlanSelected?.(outcome.result);
      setStatusNote({
        tone: "ok",
        text:
          direction === "on"
            ? PLAN_SELECTION.results.announceOn(plan.title)
            : PLAN_SELECTION.results.announceOff(plan.title),
      });
      selection.reset();
      return;
    }

    if (outcome.error.reconcile) {
      // The plan's real state moved on — reconcile from the server.
      onSelectionReconcile?.();
      setStatusNote({ tone: "warn", text: PLAN_SELECTION.error.reconciled });
    } else {
      // Network / unknown: nothing changed, let them try again.
      setStatusNote({ tone: "warn", text: PLAN_SELECTION.error.retry });
    }
    selection.reset();
  }

  if (plans.length === 0) {
    return (
      <div className={styles.resultsWrapper}>
        <div className={styles.emptyResults}>
          <Icon name="inbox" size={32} />
          <p className="sp-h4">
            {surprise
              ? "No encontramos suficientes actividades cerca de tu ubicación"
              : "No encontramos un plan para eso"}
          </p>
          <p className="sp-body">
            {surprise
              ? "Intentá en otro momento o explorá otras zonas."
              : "Probá contarnos tu idea de otra forma."}
          </p>
          <div className={styles.resultsActions}>
            {canAdjust ? (
              <Button variant="ghostEmber" onClick={onAdjust}>
                Ajustar la idea
              </Button>
            ) : null}
            {surprise && onRegenerate ? (
              <Button variant="ghostEmber" onClick={onRegenerate}>
                <Icon name="sparkles" size={15} aria-hidden="true" />
                Sorpréndeme de nuevo
              </Button>
            ) : null}
            <Button variant="ghostLight" onClick={onDiscard}>
              {surprise ? "Volver al inicio" : "Empezar de nuevo"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.resultsWrapper}>
      <div className={styles.resultsHeader}>
        <h2 className={`sp-h2 ${styles.resultsTitle}`}>
          {surprise ? "Elegimos estas ideas para vos" : "Tu plan ya está listo"}
        </h2>
        <p className={`sp-body ${styles.resultsSubtitle}`}>
          {surprise
            ? "Cualquiera de las alternativas es un buen plan."
            : "Marcá la que pensás hacer."}
        </p>
        {note ? (
          <p className={`sp-small ${styles.resultsSubtitle}`}>{note}</p>
        ) : null}
        <p
          className={
            statusNote?.tone === "warn"
              ? styles.resultLiveWarn
              : styles.resultLive
          }
          role="status"
          aria-live="polite"
        >
          {statusNote?.text ?? ""}
        </p>
      </div>

      <div className={styles.resultsGrid}>
        {visiblePlans.map((plan, index) => {
          const intended = plan.viewerPlanState === "selected";
          const busy = workingId === plan.id;

          return (
            <div
              key={plan.id}
              className={styles.resultCard}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <article
                className={[
                  exploreStyles.card,
                  styles.resultCardShell,
                  intended ? styles.resultCardChosen : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Link
                  href={planDetailRoute(plan.id)}
                  className={styles.resultCardLink}
                >
                  <div
                    className={exploreStyles.imageWrapper}
                    style={{ background: gradientFor(plan.id) }}
                  >
                    <Icon
                      name="route"
                      size={40}
                      className={exploreStyles.imagePlaceholder}
                    />
                  </div>

                  <div className={exploreStyles.body}>
                    <h3 className={exploreStyles.name}>{plan.title}</h3>

                    <div className={exploreStyles.metaRow}>
                      <span className={exploreStyles.metaItem}>
                        <Icon name="clock" size={12} />
                        {formatDuration(plan.estimatedTotalDuration)}
                      </span>
                      <Badge variant="cost">
                        {formatArs(plan.estimatedTotalCost)}
                      </Badge>
                      {plan.averageRating > 0 ? (
                        <span className={exploreStyles.metaItem}>
                          <Stars rating={plan.averageRating} size={11} />
                          {plan.averageRating.toFixed(1)}
                        </span>
                      ) : null}
                      {plan.distanceKm != null ? (
                        <span className={exploreStyles.metaItem}>
                          <Icon name="map-pin" size={12} />
                          {plan.distanceKm.toFixed(1)} km
                        </span>
                      ) : null}
                    </div>

                    {plan.activityNames && plan.activityNames.length > 0 ? (
                      <p className={styles.resultActivities}>
                        {plan.activityNames.join(" · ")}
                      </p>
                    ) : null}

                    <div className={exploreStyles.tagRow}>
                      {plan.categories.slice(0, 2).map((category) => (
                        <Badge variant="tag" key={category.id}>
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Link>

                <div className={styles.resultActionRow}>
                  {intended ? (
                    <>
                      <span className={styles.resultChosen}>
                        <Icon
                          name="circle-check"
                          size={15}
                          aria-hidden="true"
                        />
                        {PLAN_SELECTION.results.intended}
                      </span>
                      <button
                        type="button"
                        className={styles.resultUndo}
                        disabled={selection.status === "working"}
                        onClick={() => void toggleIntent(plan, "off")}
                      >
                        {busy ? "…" : PLAN_SELECTION.results.undo}
                      </button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={selection.status === "working"}
                      onClick={() => void toggleIntent(plan, "on")}
                    >
                      {busy ? (
                        <>
                          <Icon
                            name="loader-circle"
                            size={14}
                            className={styles.resultSpinner}
                            aria-hidden="true"
                          />
                          {PLAN_SELECTION.results.intend}
                        </>
                      ) : (
                        PLAN_SELECTION.results.intend
                      )}
                    </Button>
                  )}
                </div>
              </article>
            </div>
          );
        })}
      </div>

      <div className={styles.resultsFooter}>
        {canAdjust ? (
          <Button variant="ghostEmber" onClick={onAdjust}>
            <Icon name="pencil" size={15} aria-hidden="true" />
            Ajustar la búsqueda
          </Button>
        ) : null}
        {surprise && onRegenerate ? (
          <Button variant="ghostEmber" onClick={onRegenerate}>
            <Icon name="sparkles" size={15} aria-hidden="true" />
            Sorpréndeme de nuevo
          </Button>
        ) : null}
        <Button variant="ghostLight" onClick={onDiscard}>
          {surprise ? "Volver al inicio" : "Descartar"}
        </Button>
      </div>
    </div>
  );
}
