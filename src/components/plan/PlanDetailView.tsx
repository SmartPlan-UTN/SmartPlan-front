"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ExperienceSummary, FeedbackInvite } from "@/components/feedback";
import { Badge, Button, ConfirmationDialog, Divider, FloatingBackLink, Icon, Stars } from "@/components/ui";
import { useDetailFetch, usePlanSelection } from "@/hooks";
import { ApiError, cancelOwnPlan, getOwnPlan, getPlan } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { activityDetailRoute, planEditRoute, ROUTES } from "@/lib/routes";
import { formatArs, formatDuration, googleMapsUrl } from "@/lib/utils";
import type {
  FeedbackState,
  PlanDetailResult,
  PlanFeedback,
  PlanItineraryItem,
  PlanStatusKey,
  ViewerPlanState,
} from "@/types";

import { PlanIntentionPanel } from "./PlanIntentionPanel";
import { PLAN_SELECTION } from "./planSelectionContent";
import { planStatusPresentation } from "./statusPresentation";
import styles from "./plan.module.css";
import activityStyles from "../activity/activity.module.css";

export interface PlanDetailViewProps {
  planId: number;
}

const GENERIC_ERROR = "No pudimos cargar el plan. Intentá de nuevo.";

function ItineraryStep({
  detail,
  isFirst,
  isLast,
}: {
  detail: PlanItineraryItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { activity } = detail;
  const location = activity.locations[0] ?? null;
  const categoryLabel =
    activity.categories.length > 0
      ? activity.categories.map((category) => category.name).join(" · ")
      : null;

  return (
    <div className={styles.stepRow}>
      <div className={styles.stepTimeline}>
        <span
          className={`${styles.stepLine} ${!isFirst ? styles.stepLineVisible : ""}`}
        />
        <span className={styles.stepBadge}>{detail.order}</span>
        <span
          className={`${styles.stepLine} ${!isLast ? styles.stepLineVisible : ""}`}
        />
      </div>

      {/* The whole card is a target — matches PlanDetail.jsx's
          card-wide onClick — via a stretched `Link` overlay instead of a
          click handler on a `<div>`, so it stays keyboard- and
          screen-reader-accessible. "Ver en mapa", a real external link,
          sits above the overlay so it keeps its own click. */}
      <div className={styles.stepCard}>
        <Link
          href={activityDetailRoute(activity.id)}
          className={styles.stepStretchedLink}
          aria-label={`Ver ${activity.name}`}
        />

        <div>
          <div className={styles.stepBadgeRow}>
            {categoryLabel ? <Badge variant="tag">{categoryLabel}</Badge> : null}
            <span className={styles.stepRating}>
              <Stars rating={activity.averageRating} size={11} />
              <span>{activity.averageRating.toFixed(1)}</span>
            </span>
          </div>

          <p className={styles.stepName}>{activity.name}</p>

          <div className={styles.stepMetaRow}>
            {location ? (
              <span className={styles.stepMetaItem}>
                <Icon name="map-pin" size={13} />
                {location.place.address}
              </span>
            ) : null}
            <span className={styles.stepMetaItem}>
              <Icon name="clock" size={13} />
              {formatDuration(detail.estimatedDuration)}
            </span>
          </div>
        </div>

        <div className={styles.stepActions}>
          <p className={styles.stepCost}>{formatArs(detail.estimatedCost)}</p>

          <div className={styles.stepLinks}>
            {location ? (
              <a
                href={googleMapsUrl(
                  location.latitude,
                  location.longitude,
                  location.place.address,
                )}
                target="_blank"
                rel="noreferrer"
                className={styles.stepMapLink}
              >
                <Icon name="map-pin" size={13} aria-hidden="true" />
                Ver en mapa
              </a>
            ) : null}
            <span className={styles.stepDetailHint}>
              Ver detalle
              <Icon name="chevron-right" size={12} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Plan detail (CU13 · PAN 17), matching
 * SmartPlanSystemDesign/v2/PlanDetail.jsx: a full-bleed dark hero, a
 * timeline itinerary, a dark cost breakdown card, and a non-sticky action
 * row (the mockup keeps it in normal flow, unlike ActivityDetail.jsx's
 * fixed one).
 *
 * The mockup's social-proof strip ("312 personas hicieron este plan · 97%
 * lo recomiendan") and per-person cost split are fabricated demo numbers
 * with no backend behind them — there's no "people who did this plan"
 * tracking or party-size field in the contract, so both are left out
 * rather than inventing data. "Lo voy a hacer" is CU22 — a reversible intent
 * toggle (`PATCH`/`DELETE /plans/:id/select`), shown only when the caller can
 * act on it. "Compartir" is real — it copies the page URL.
 */
export function PlanDetailView({ planId }: PlanDetailViewProps) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const {
    data: plan,
    status,
    errorMessage,
    refetch,
  } = useDetailFetch<PlanDetailResult>(
    getPlan,
    planId,
    GENERIC_ERROR,
    sessionStatus !== "loading",
  );
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownPlan, setOwnPlan] = useState<import("@/types").OwnPlanDetail | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [ownFeedback, setOwnFeedback] = useState<{
    planId: number;
    feedbackState: FeedbackState;
    feedback: PlanFeedback | null;
    completedAt: string | null;
    activityCount: number;
  } | null>(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    let active = true;
    getOwnPlan(planId)
      .then((data) => {
        if (active) {
          setIsOwner(true);
          setOwnPlan(data);
          setOwnFeedback({
            planId: data.id,
            feedbackState: data.feedbackState,
            feedback: data.feedback,
            completedAt: data.completedAt ?? data.createdAt,
            activityCount: data.activityCount,
          });
        }
      })
      .catch(() => {
        if (active) {
          setIsOwner(false);
          setOwnPlan(null);
        }
      });
    return () => {
      active = false;
    };
  }, [sessionStatus, planId]);

  // CU23. Feedback lives on the owner-only endpoint; the public detail never
  // carries it. A secondary, non-blocking fetch — a viewer who isn't the
  // owner just gets a 403/404 here and no feedback section shows. Keyed by
  // plan id so a stale result from a previous plan never renders.
  const planId_ = plan?.id ?? null;
  useEffect(() => {
    if (sessionStatus !== "authenticated" || planId_ == null) return;
    let active = true;
    getOwnPlan(planId_)
      .then((own) => {
        if (active) {
          setOwnFeedback({
            planId: own.id,
            feedbackState: own.feedbackState,
            feedback: own.feedback,
            completedAt: own.completedAt ?? own.createdAt,
            activityCount: own.activityCount,
          });
        }
      })
      .catch(() => {
        // Not the owner, or offline — leave the feedback section hidden.
      });
    return () => {
      active = false;
    };
  }, [sessionStatus, planId_]);

  const feedbackInfo =
    ownFeedback && ownFeedback.planId === planId_ ? ownFeedback : null;

  async function reconcileFeedback() {
    if (planId_ == null) return;
    try {
      const own = await getOwnPlan(planId_);
      setOwnFeedback({
        planId: own.id,
        feedbackState: own.feedbackState,
        feedback: own.feedback,
        completedAt: own.completedAt ?? own.createdAt,
        activityCount: own.activityCount,
      });
    } catch {
      // Keep the current owner-only projection if reconciliation is offline.
    }
  }

  // CU22. The new status is applied from the backend result, not optimistically;
  // `useDetailFetch` has no mutate, so a local override reflects it until the
  // next real load (a navigation back here re-reads the authoritative state).
  const selection = usePlanSelection();
  const [override, setOverride] = useState<{
    statusKey: PlanStatusKey;
    viewerPlanState: ViewerPlanState;
  } | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  async function toggleIntent(direction: "on" | "off") {
    if (!plan || selection.status === "working") return;
    setLiveMessage("");

    const outcome = await (direction === "on"
      ? selection.select(plan.id)
      : selection.deselect(plan.id));
    if (!outcome) return;

    if (outcome.ok) {
      setOverride({
        statusKey: outcome.result.status.key,
        viewerPlanState: direction === "on" ? "selected" : "selectable",
      });
      setLiveMessage(
        direction === "on"
          ? PLAN_SELECTION.detail.announceOn
          : PLAN_SELECTION.detail.announceOff,
      );
      selection.reset();
      return;
    }

    if (outcome.error.reconcile) {
      // The plan moved on — reconcile from the server, drop the local override.
      setOverride(null);
      setLiveMessage(PLAN_SELECTION.error.reconciled);
      selection.reset();
      refetch();
    } else {
      // Network / unknown: nothing changed.
      setLiveMessage(PLAN_SELECTION.error.retry);
      selection.reset();
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Clipboard access can be denied by the browser; the button just
      // stays as "Compartir" instead of throwing at the user.
    }
  }

  async function handleConfirmCancel() {
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelOwnPlan(planId);
      setShowCancelModal(false);
      router.push(ROUTES.plans);
    } catch (error: unknown) {
      setIsCancelling(false);
      setCancelError(
        error instanceof ApiError
          ? error.message
          : "No pudimos eliminar el plan. Intentá de nuevo.",
      );
    }
  }

  if (status === "loading") {
    return (
      <div className={activityStyles.stateBlock}>
        <div className={activityStyles.loadingDots}>
          <span className={activityStyles.loadingDot} />
          <span className={activityStyles.loadingDot} />
          <span className={activityStyles.loadingDot} />
        </div>
        <p className="sp-body">Cargando el plan...</p>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
        <h1 className="sp-h3">No encontramos este plan</h1>
        <p className="sp-body">Puede que ya no esté disponible.</p>
        <Link href={ROUTES.explore} className={activityStyles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Volver a explorar
        </Link>
      </div>
    );
  }

  if (status === "error" || plan == null) {
    return (
      <div className={activityStyles.stateBlock} role="alert">
        <Icon name="triangle-alert" size={32} className={activityStyles.errorIcon} />
        <h1 className="sp-h3">Algo salió mal</h1>
        <p className="sp-body">{errorMessage}</p>
      </div>
    );
  }

  const routeSummary = plan.details
    .map((detail) => detail.activity.name)
    .join(" → ");

  const statusKey = override?.statusKey ?? plan.status.key;
  const viewerPlanState = override?.viewerPlanState ?? plan.viewerPlanState;
  const statusInfo = planStatusPresentation(statusKey);

  return (
    <div>
      <FloatingBackLink href={ROUTES.explore} label="Volver" heroRef={heroRef} />

      <p className={styles.srOnly} role="status" aria-live="polite">
        {liveMessage}
      </p>

      <div className={styles.hero} ref={heroRef}>
        <Icon name="route" size={110} className={styles.heroIcon} />
        <Badge variant="cost" className={styles.heroCostBadge}>
          {formatArs(plan.estimatedTotalCost)}
        </Badge>

        <div className={styles.heroTitleBlock}>
          <div className={styles.heroMetaRow}>
            {statusInfo ? (
              <>
                <span className={styles.heroStatus}>{statusInfo.label}</span>
                <span className={styles.heroMetaDot}>·</span>
              </>
            ) : null}
            <Stars rating={plan.averageRating} size={14} />
            <span>{plan.averageRating.toFixed(1)}</span>
            <span className={styles.heroMetaDot}>·</span>
            <span>{formatDuration(plan.estimatedTotalDuration)}</span>
          </div>
          <h1 className={styles.heroTitle}>{plan.title}</h1>
          {routeSummary ? (
            <div className={styles.heroLocation}>
              <Icon name="map-pin" size={14} />
              {routeSummary}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.content}>
        {plan.status.key === "cancelled" ? (
          <div className={styles.cancelledBanner} role="status">
            <Icon name="triangle-alert" size={20} aria-hidden="true" />
            <div>
              <strong>Plan cancelado:</strong> Este plan se conserva como
              historial de lectura y no acepta modificaciones.
            </div>
          </div>
        ) : null}
        {plan.description ? (
          <p className={`sp-body-lg ${activityStyles.detailDescription}`}>
            {plan.description}
          </p>
        ) : null}

        <div className={styles.section}>
          <p className={activityStyles.sectionLabel}>itinerario</p>
          {plan.details.map((detail, index) => (
            <ItineraryStep
              detail={detail}
              isFirst={index === 0}
              isLast={index === plan.details.length - 1}
              key={detail.id}
            />
          ))}
        </div>

        <div className={styles.costBox}>
          <p className={styles.costBoxLabel}>estimación de costos</p>
          <div className={styles.costBreakdown}>
            {plan.details.map((detail) => (
              <div className={styles.costRow} key={detail.id}>
                <span className={styles.costRowLabel}>{detail.activity.name}</span>
                <span className={styles.costRowValue}>
                  {formatArs(detail.estimatedCost)}
                </span>
              </div>
            ))}
          </div>
          <Divider dark />
          <div className={styles.costTotalRow}>
            <span className={styles.costRowLabel}>Total</span>
            <span className={styles.costTotalValue}>
              {formatArs(plan.estimatedTotalCost)}
            </span>
          </div>
          {ownPlan && ownPlan.peopleCount > 0 ? (
            <div className={styles.costPerPersonRow}>
              <span className={styles.costRowLabel}>
                Costo por persona ({ownPlan.peopleCount}{" "}
                {ownPlan.peopleCount === 1 ? "persona" : "personas"})
              </span>
              <span className={styles.costRowValue}>
                {formatArs(ownPlan.estimatedCostPerPerson)}
              </span>
            </div>
          ) : null}
        </div>

        {feedbackInfo?.feedback ? (
          <ExperienceSummary
            feedback={feedbackInfo.feedback}
            estimatedTotalCost={plan.estimatedTotalCost}
          />
        ) : feedbackInfo?.feedbackState === "available" ? (
          <FeedbackInvite
            planId={plan.id}
            planTitle={plan.title}
            estimatedTotalCost={plan.estimatedTotalCost}
            completedAt={feedbackInfo.completedAt}
            activityCount={feedbackInfo.activityCount}
            onSubmitted={(feedback) =>
              setOwnFeedback({
                planId: plan.id,
                feedbackState: "submitted",
                feedback,
                completedAt: feedbackInfo.completedAt,
                activityCount: feedbackInfo.activityCount,
              })
            }
            onReconcile={() => void reconcileFeedback()}
          />
        ) : null}

        <div className={styles.actionBar}>
          {sessionStatus === "authenticated" && isOwner && plan.status.key !== "cancelled" ? (
            <>
              <Link href={planEditRoute(planId)} className={styles.ownerActionLink}>
                <Button variant="ghostLight" className={styles.ownerActionButton}>
                  <Icon name="pencil" size={16} aria-hidden="true" />
                  Editar plan
                </Button>
              </Link>
              <Button
                variant="ghostLight"
                className={styles.ownerActionButton}
                onClick={() => setShowCancelModal(true)}
              >
                <Icon name="trash-2" size={16} aria-hidden="true" />
                Eliminar plan
              </Button>
            </>
          ) : null}
          {/* Guardar + Compartir — secondary. Each control reserves its
              widest label so a state swap never changes its box. */}
          <div className={styles.actionSecondary}>
            <Button
              variant="ghostLight"
              size="sm"
              className={styles.saveButton}
              aria-pressed={saved}
              onClick={() => {
                setSaved((current) => !current);
              }}
            >
              <Icon
                name="bookmark"
                size={16}
                aria-hidden="true"
                className={saved ? styles.saveIconOn : undefined}
              />
              {saved ? "Guardado" : "Guardar plan"}
            </Button>
            <Button
              variant="ghostLight"
              size="sm"
              className={styles.shareButton}
              onClick={() => {
                void handleShare();
              }}
            >
              <Icon name="share-2" size={16} aria-hidden="true" />
              {copied ? "¡Copiado!" : "Compartir"}
            </Button>
          </div>

          {/* Personal state on the plan (CU22) — carries the visual weight. */}
          <PlanIntentionPanel
            viewerPlanState={viewerPlanState}
            statusKey={statusKey}
            busy={selection.status === "working"}
            onIntend={() => void toggleIntent("on")}
            onWithdraw={() => void toggleIntent("off")}
          />
        </div>
      </div>

      {showCancelModal ? (
        <ConfirmationDialog
          title="¿Eliminar este plan?"
          confirmLabel="Sí, eliminar plan"
          confirmingLabel="Eliminando..."
          cancelLabel="Volver"
          isConfirming={isCancelling}
          error={cancelError}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={() => void handleConfirmCancel()}
        >
          <p>El plan se eliminará de tus planes y ya no estará disponible.</p>
        </ConfirmationDialog>
      ) : null}
    </div>
  );
}
