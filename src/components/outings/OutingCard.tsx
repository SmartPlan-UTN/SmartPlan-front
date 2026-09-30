import Link from "next/link";

import { FeedbackInvite, ratingLabel } from "@/components/feedback";
import { Badge, Button, Icon, Stars } from "@/components/ui";
import { outingDetailRoute } from "@/lib/routes";
import { formatArs } from "@/lib/utils";
import type { OutingSummary, PlanFeedback } from "@/types";

import { OUTINGS_COPY } from "./outingsContent";
import styles from "./outings.module.css";

export interface OutingCardProps {
  outing: OutingSummary;
  /** An action on this card is in flight — freeze its controls. */
  busy: boolean;
  /** "Ahora no" was pressed this session — hide the invite. */
  inviteDismissed: boolean;
  onComplete: (outing: OutingSummary) => void;
  onCancel: (outing: OutingSummary) => void;
  onRepeat: (outing: OutingSummary) => void;
  onDismissInvite: () => void;
  onSubmitted: (outingId: number, feedback: PlanFeedback) => void;
  onReconcile: () => void;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * One outing of "Mis salidas" (#130). The whole card opens its detail; its
 * actions sit above that stretched link and keep their own clicks.
 *
 *  - to do: "Marcar como realizada" and "Cancelar salida";
 *  - done: the feedback invite while it's open (with "Ahora no"), the rated
 *    line once sent, and "Volver a hacer este plan".
 */
export function OutingCard({
  outing,
  busy,
  inviteDismissed,
  onComplete,
  onCancel,
  onRepeat,
  onDismissInvite,
  onSubmitted,
  onReconcile,
}: OutingCardProps) {
  const done = outing.status === "completed";
  const when = done ? (outing.completedAt ?? outing.createdAt) : outing.createdAt;
  const showInvite = outing.feedbackState === "available" && !inviteDismissed;
  const rated =
    outing.feedbackState === "submitted" && outing.feedback
      ? outing.feedback
      : null;

  return (
    <article className={styles.card}>
      <Link
        href={outingDetailRoute(outing.id)}
        className={styles.cardMainLink}
        aria-label={`Ver ${outing.title}`}
      >
        <div className={styles.cardMain}>
          <div className={styles.cardHead}>
            <p className={styles.date}>
              {done ? OUTINGS_COPY.doneOn : OUTINGS_COPY.chosenOn}{" "}
              {dateFormatter.format(new Date(when))}
            </p>
            <h3 className={styles.cardTitle}>{outing.title}</h3>
          </div>

          <div className={styles.meta}>
            {done ? (
              <span className={styles.statusPill}>
                <Icon name="circle-check" size={12} aria-hidden="true" />
                {OUTINGS_COPY.completedPill}
              </span>
            ) : null}
            <Badge variant="cost">{formatArs(outing.estimatedTotalCost)}</Badge>
            <span className={styles.metaItem}>
              <Icon name="route" size={13} aria-hidden="true" />
              {outing.activityCount}{" "}
              {outing.activityCount === 1 ? "actividad" : "actividades"}
            </span>
            {outing.source && !outing.source.available ? (
              <span className={styles.metaItem}>
                <Icon name="info" size={13} aria-hidden="true" />
                {OUTINGS_COPY.sourceUnavailable}
              </span>
            ) : null}
          </div>

          {outing.activityNames.length > 0 ? (
            <p className={styles.route}>{outing.activityNames.join(" → ")}</p>
          ) : null}

          {rated ? (
            <RatedLine feedback={rated} estimated={outing.estimatedTotalCost} />
          ) : null}
        </div>
      </Link>

      {showInvite ? (
        <div className={styles.cardFeedback}>
          <FeedbackInvite
            planId={outing.id}
            planTitle={outing.title}
            estimatedTotalCost={outing.estimatedTotalCost}
            completedAt={outing.completedAt}
            activityCount={outing.activityCount}
            onDismiss={onDismissInvite}
            onSubmitted={(feedback) => onSubmitted(outing.id, feedback)}
            onReconcile={onReconcile}
          />
        </div>
      ) : null}

      <div className={styles.cardActions}>
        {done ? (
          <Button
            variant="ghostEmber"
            size="sm"
            disabled={busy}
            onClick={() => onRepeat(outing)}
          >
            <Icon name="repeat" size={14} aria-hidden="true" />
            {busy ? OUTINGS_COPY.actions.repeating : OUTINGS_COPY.actions.repeat}
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => onComplete(outing)}
            >
              <Icon name="circle-check" size={14} aria-hidden="true" />
              {busy
                ? OUTINGS_COPY.actions.completing
                : OUTINGS_COPY.actions.complete}
            </Button>
            <Button
              variant="ghostLight"
              size="sm"
              disabled={busy}
              onClick={() => onCancel(outing)}
            >
              {OUTINGS_COPY.actions.cancel}
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function RatedLine({
  feedback,
  estimated,
}: {
  feedback: PlanFeedback;
  estimated: number;
}) {
  const hasRealCost = feedback.actualCost != null && feedback.actualCost > 0;
  return (
    <div className={styles.rated}>
      <span className={styles.ratedScore}>
        <Stars rating={feedback.rating} size={14} />
        {ratingLabel(feedback.rating)}
      </span>
      {hasRealCost ? (
        <span className={styles.ratedCost}>
          <strong>{formatArs(feedback.actualCost as number)}</strong> gastados ·{" "}
          {formatArs(estimated)} estimados
        </span>
      ) : null}
    </div>
  );
}
