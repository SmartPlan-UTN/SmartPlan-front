"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge, Button, ConfirmationDialog, Divider, FloatingBackLink, Icon, Stars } from "@/components/ui";
import { MediaGallery } from "@/components/media";
import { useFavorites } from "@/context";
import { useDetailFetch, usePlanSelection } from "@/hooks";
import { ApiError, cancelOwnPlan, getOwnPlan, getPlan } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { outingDetailRoute, planEditRoute, ROUTES } from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
import type {
  OwnPlanDetail,
  PlanDetailResult,
  PlanVisibility,
  ViewerPlanState,
} from "@/types";

import { CommunityExperiences } from "./CommunityExperiences";
import { ItineraryStep } from "./ItineraryStep";
import { PlanIntentionPanel } from "./PlanIntentionPanel";
import {
  PlanVisibilityBadge,
  PlanVisibilityControl,
} from "./PlanVisibilityControl";
import { PLAN_SELECTION } from "./planSelectionContent";
import { planStatusPresentation } from "./statusPresentation";
import { VISIBILITY_COPY } from "./visibilityContent";
import styles from "./plan.module.css";
import activityStyles from "../activity/activity.module.css";

export interface PlanDetailViewProps {
  planId: number;
}

const GENERIC_ERROR = "No pudimos cargar el plan. Intentá de nuevo.";

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
 * rather than inventing data. "Lo voy a hacer" is CU22 — a one-shot action
 * that copies the plan into an outing of "Mis salidas" (`POST
 * /users/me/outings`), shown only when the caller can choose the plan; once
 * done it reads "Agregado a Mis salidas" (#130). "Compartir" is real — it
 * copies the page URL.
 *
 * The author of a plan also gets its visibility (Público/Privado) and can
 * publish it or make it private. An outing is not a plan to browse: its
 * owner is sent to its page in Mis salidas.
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
  const { isPlanSaved, toggleSavePlan } = useFavorites();
  const saved = isPlanSaved(planId);
  const [copied, setCopied] = useState(false);
  const [ownPlan, setOwnPlan] = useState<OwnPlanDetail | null>(null);
  const [visibilityOverride, setVisibilityOverride] =
    useState<PlanVisibility | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const isAuthor = plan?.ownedByViewer === true && plan.kind === "authored";

  // An outing has its own page, with its lifecycle and feedback.
  useEffect(() => {
    if (plan?.kind === "outing" && plan.ownedByViewer) {
      router.replace(outingDetailRoute(plan.id));
    }
  }, [plan, router]);

  // The author's projection carries the people count behind the per-person
  // cost; nobody else can read it.
  useEffect(() => {
    if (!isAuthor || plan == null) return;
    let active = true;
    getOwnPlan(plan.id)
      .then((own) => {
        if (active) setOwnPlan(own);
      })
      .catch(() => {
        // Keep the shared detail; the per-person cost just stays hidden.
      });
    return () => {
      active = false;
    };
  }, [isAuthor, plan]);

  // CU22. The outing is applied from the backend result, not optimistically;
  // `useDetailFetch` has no mutate, so a local override reflects it until the
  // next real load (a navigation back here re-reads the authoritative state).
  const selection = usePlanSelection();
  const [override, setOverride] = useState<{
    viewerPlanState: ViewerPlanState;
    activeOutingId: number | null;
  } | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  async function chooseOuting() {
    if (!plan || selection.status === "working") return;
    setLiveMessage("");

    const outcome = await selection.choose(plan.id);
    if (!outcome) return;

    if (outcome.ok) {
      setOverride({
        viewerPlanState: "selected",
        activeOutingId: outcome.result.outing.id,
      });
      setLiveMessage(PLAN_SELECTION.announceAdded(plan.title));
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

  const viewerPlanState = override?.viewerPlanState ?? plan.viewerPlanState;
  const activeOutingId =
    override?.activeOutingId ?? plan.activeOutingId ?? null;
  const visibility = visibilityOverride ?? plan.visibility;
  const statusInfo = planStatusPresentation(plan.status.key);

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

        <MediaGallery target="plan" resourceId={plan.id} resourceName={plan.title} />
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

        {/* Experiences of people who did it (#106): only a published plan
            has a community to show. */}
        {plan.kind === "authored" && visibility === "public" ? (
          <CommunityExperiences planId={plan.id} planTitle={plan.title} />
        ) : null}

        {isAuthor ? (
          <div className={styles.visibilityBox}>
            <div>
              <PlanVisibilityBadge visibility={visibility} />
              <p className={styles.visibilityHint}>
                {VISIBILITY_COPY.hint[visibility]}
              </p>
            </div>
            {plan.status.key !== "cancelled" ? (
              <PlanVisibilityControl
                planId={plan.id}
                planTitle={plan.title}
                visibility={visibility}
                onChanged={(next) => {
                  setVisibilityOverride(next);
                  setLiveMessage(VISIBILITY_COPY.announce[next]);
                }}
              />
            ) : null}
          </div>
        ) : null}

        <div className={styles.actionBar}>
          {sessionStatus === "authenticated" && isAuthor && plan.status.key !== "cancelled" ? (
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
                <Icon name="trash-2" size={14} aria-hidden="true" />
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
              aria-label={saved ? "Quitar de guardados" : "Guardar plan"}
              onClick={() => {
                // Optimistic rollback is handled inside FavoritesContext (CU43).
                void toggleSavePlan(planId);
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
            activeOutingId={activeOutingId}
            busy={selection.status === "working"}
            onIntend={() => void chooseOuting()}
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
