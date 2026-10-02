"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  ExperienceSummary,
  ExperienceSharing,
  FeedbackDialog,
  FeedbackInvite,
} from "@/components/feedback";
import { ItineraryStep } from "@/components/plan/ItineraryStep";
import { MediaGalleryManager } from "@/components/media";
import planStyles from "@/components/plan/plan.module.css";
import activityStyles from "@/components/activity/activity.module.css";
import {
  Badge,
  Button,
  ConfirmationDialog,
  Divider,
  FloatingBackLink,
  Icon,
} from "@/components/ui";
import { useDetailFetch } from "@/hooks";
import {
  cancelOuting,
  completeOuting,
  getOuting,
  repeatOuting,
} from "@/lib/api";
import {
  outingDetailRoute,
  outingsTabRoute,
  planDetailRoute,
  ROUTES,
} from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
import type { OutingDetail, PlanFeedback } from "@/types";

import { OUTINGS_COPY } from "./outingsContent";
import styles from "./outings.module.css";

export interface OutingDetailViewProps {
  outingId: number;
}

const GENERIC_ERROR = "No pudimos cargar la salida. Intentá de nuevo.";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

/**
 * One outing of "Mis salidas" (#130, CU22, CU23): the itinerary exactly as it
 * was when the person chose it — later edits to the original never reach it —
 * with its own lifecycle. The 24 h feedback reminder opens this page.
 *
 *  - to do: "Marcar como realizada" (feedback opens right away, with "Ahora
 *    no") and "Cancelar salida" (asks first, then back to Mis salidas);
 *  - done: the feedback invite while it's open, the experience once sent,
 *    and "Volver a hacer este plan", which opens the new outing.
 */
export function OutingDetailView({ outingId }: OutingDetailViewProps) {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const { data, status, errorMessage } = useDetailFetch<OutingDetail>(
    getOuting,
    outingId,
    GENERIC_ERROR,
  );
  // Local, backend-confirmed replacements of the fetched outing.
  const [override, setOverride] = useState<OutingDetail | null>(null);
  const outing = override?.id === outingId ? override : data;

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [galleryVersion, setGalleryVersion] = useState(0);

  if (status === "loading" && !outing) {
    return (
      <div className={activityStyles.stateBlock}>
        <div className={activityStyles.loadingDots}>
          <span className={activityStyles.loadingDot} />
          <span className={activityStyles.loadingDot} />
          <span className={activityStyles.loadingDot} />
        </div>
        <p className="sp-body">Cargando la salida...</p>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
        <h1 className="sp-h3">No encontramos esta salida</h1>
        <p className="sp-body">Puede que la hayas cancelado.</p>
        <Link href={ROUTES.outings} className={activityStyles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Volver a Mis salidas
        </Link>
      </div>
    );
  }

  if (!outing) {
    return (
      <div className={activityStyles.stateBlock} role="alert">
        <Icon
          name="triangle-alert"
          size={32}
          className={activityStyles.errorIcon}
        />
        <h1 className="sp-h3">Algo salió mal</h1>
        <p className="sp-body">{errorMessage}</p>
      </div>
    );
  }

  const current = outing;
  const done = current.status === "completed";

  async function handleComplete() {
    setBusy(true);
    setActionError(null);
    try {
      const completed = await completeOuting(current.id);
      setOverride(completed);
      setLiveMessage(OUTINGS_COPY.notices.completed(current.title));
      setFeedbackOpen(true);
    } catch {
      setActionError(OUTINGS_COPY.errors.complete);
    } finally {
      setBusy(false);
    }
  }

  async function handleRepeat() {
    setBusy(true);
    setActionError(null);
    try {
      const { outing: next } = await repeatOuting(current.id);
      router.push(outingDetailRoute(next.id));
    } catch {
      setActionError(OUTINGS_COPY.errors.repeat);
      setBusy(false);
    }
  }

  async function confirmCancel() {
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelOuting(current.id);
      router.push(ROUTES.outings);
    } catch {
      setCancelError(OUTINGS_COPY.errors.cancel);
      setIsCancelling(false);
    }
  }

  function applyFeedback(feedback: PlanFeedback) {
    setOverride({ ...current, feedbackState: "submitted", feedback });
    setFeedbackOpen(false);
  }

  function refreshGallery() {
    setGalleryVersion((version) => version + 1);
  }

  const routeSummary = current.activityNames.join(" → ");

  return (
    <div>
      <FloatingBackLink
        href={outingsTabRoute(done ? "completed" : "to-do")}
        label="Mis salidas"
        heroRef={heroRef}
      />

      <p className={planStyles.srOnly} role="status" aria-live="polite">
        {liveMessage}
      </p>

      <div className={planStyles.hero} ref={heroRef}>
        <Icon name="calendar-check" size={110} className={planStyles.heroIcon} />
        <Badge variant="cost" className={planStyles.heroCostBadge}>
          {formatArs(current.estimatedTotalCost)}
        </Badge>

        <div className={planStyles.heroTitleBlock}>
          <div className={planStyles.heroMetaRow}>
            <span className={planStyles.heroStatus}>
              {done ? OUTINGS_COPY.completedPill : OUTINGS_COPY.tabs.toDo}
            </span>
            <span className={planStyles.heroMetaDot}>·</span>
            <span>{formatDuration(current.estimatedTotalDuration)}</span>
            {current.completedAt ? (
              <>
                <span className={planStyles.heroMetaDot}>·</span>
                <time dateTime={current.completedAt}>
                  {dateFormatter.format(new Date(current.completedAt))}
                </time>
              </>
            ) : null}
          </div>
          <h1 className={planStyles.heroTitle}>{current.title}</h1>
          {routeSummary ? (
            <div className={planStyles.heroLocation}>
              <Icon name="map-pin" size={14} />
              {routeSummary}
            </div>
          ) : null}
        </div>
      </div>

      <div className={planStyles.content}>
        {current.description ? (
          <p className={`sp-body-lg ${activityStyles.detailDescription}`}>
            {current.description}
          </p>
        ) : null}

        {current.source ? (
          <p className={styles.route}>
            {current.source.available ? (
              <>
                Basada en{" "}
                <Link href={planDetailRoute(current.source.id)}>
                  «{current.source.title}»
                </Link>
                . Si el plan original cambia, esta salida no.
              </>
            ) : (
              OUTINGS_COPY.sourceUnavailable
            )}
          </p>
        ) : null}

        <div className={planStyles.section}>
          <p className={activityStyles.sectionLabel}>itinerario</p>
          {current.details.map((detail, index) => (
            <ItineraryStep
              detail={detail}
              isFirst={index === 0}
              isLast={index === current.details.length - 1}
              key={detail.id}
            />
          ))}
        </div>

        <div className={planStyles.costBox}>
          <p className={planStyles.costBoxLabel}>estimación de costos</p>
          <div className={planStyles.costBreakdown}>
            {current.details.map((detail) => (
              <div className={planStyles.costRow} key={detail.id}>
                <span className={planStyles.costRowLabel}>
                  {detail.activity.name}
                </span>
                <span className={planStyles.costRowValue}>
                  {formatArs(detail.estimatedCost)}
                </span>
              </div>
            ))}
          </div>
          <Divider dark />
          <div className={planStyles.costTotalRow}>
            <span className={planStyles.costRowLabel}>Total</span>
            <span className={planStyles.costTotalValue}>
              {formatArs(current.estimatedTotalCost)}
            </span>
          </div>
          <div className={planStyles.costPerPersonRow}>
            <span className={planStyles.costRowLabel}>
              Costo por persona ({current.peopleCount}{" "}
              {current.peopleCount === 1 ? "persona" : "personas"})
            </span>
            <span className={planStyles.costRowValue}>
              {formatArs(current.estimatedCostPerPerson)}
            </span>
          </div>
        </div>

        {current.feedback ? (
          <ExperienceSummary
            feedback={current.feedback}
            estimatedTotalCost={current.estimatedTotalCost}
            footer={
              current.source?.hasCommunity ? (
                <ExperienceSharing
                  outingId={current.id}
                  planTitle={current.source.title}
                  feedback={current.feedback}
                  onChange={(feedback) =>
                    setOverride({ ...current, feedback })
                  }
                />
              ) : null
            }
          />
        ) : current.feedbackState === "available" ? (
          <FeedbackInvite
            planId={current.id}
            planTitle={current.title}
            estimatedTotalCost={current.estimatedTotalCost}
            completedAt={current.completedAt}
            activityCount={current.activityCount}
            canShare={current.source?.hasCommunity ?? false}
            onSubmitted={applyFeedback}
            onMediaChanged={refreshGallery}
          />
        ) : null}

        {/* The photos of the whole outing — not of one activity, those go
            with each activity's rating. The cover shows in Mis salidas. */}
        {done ? (
          <MediaGalleryManager
            target="plan"
            resourceId={current.id}
            resourceName={current.title}
            refreshKey={galleryVersion}
          />
        ) : null}

        {actionError ? (
          <p className={`${styles.notice} ${styles.noticeWarn}`} role="alert">
            <Icon name="circle-alert" size={16} aria-hidden="true" />
            {actionError}
          </p>
        ) : null}

        <div className={planStyles.actionBar}>
          {done ? (
            <Button
              variant="ghostEmber"
              disabled={busy}
              onClick={() => void handleRepeat()}
            >
              <Icon name="repeat" size={16} aria-hidden="true" />
              {busy
                ? OUTINGS_COPY.actions.repeating
                : OUTINGS_COPY.actions.repeat}
            </Button>
          ) : (
            <>
              <Button
                variant="ghostLight"
                className={planStyles.ownerActionButton}
                disabled={busy}
                onClick={() => {
                  setCancelError(null);
                  setConfirmingCancel(true);
                }}
              >
                {OUTINGS_COPY.actions.cancel}
              </Button>
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => void handleComplete()}
              >
                <Icon name="circle-check" size={16} aria-hidden="true" />
                {busy
                  ? OUTINGS_COPY.actions.completing
                  : OUTINGS_COPY.actions.complete}
              </Button>
            </>
          )}
        </div>
      </div>

      {feedbackOpen && current.feedbackState === "available" ? (
        <FeedbackDialog
          open
          planId={current.id}
          planTitle={current.title}
          estimatedTotalCost={current.estimatedTotalCost}
          completedAt={current.completedAt}
          activityCount={current.activityCount}
          canShare={current.source?.hasCommunity ?? false}
          onDismiss={() => setFeedbackOpen(false)}
          onSubmitted={applyFeedback}
          onMediaChanged={refreshGallery}
        />
      ) : null}

      {confirmingCancel ? (
        <ConfirmationDialog
          title={OUTINGS_COPY.cancelDialog.title(current.title)}
          confirmLabel={OUTINGS_COPY.cancelDialog.confirm}
          confirmingLabel={OUTINGS_COPY.cancelDialog.confirming}
          cancelLabel={OUTINGS_COPY.cancelDialog.back}
          isConfirming={isCancelling}
          error={cancelError}
          onCancel={() => setConfirmingCancel(false)}
          onConfirm={() => void confirmCancel()}
        >
          <p>{OUTINGS_COPY.cancelDialog.body}</p>
        </ConfirmationDialog>
      ) : null}
    </div>
  );
}
