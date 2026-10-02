import Link from "next/link";

import { FeedbackInvite, ratingLabel } from "@/components/feedback";
import { Badge, Button, Icon, Stars } from "@/components/ui";
import { AuthenticatedImage } from "@/components/media";
import { outingDetailRoute } from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
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
  month: "long",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "short" });

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
  const whenDate = new Date(when);
  const routeSummary = outing.activityNames.join(" → ");

  return (
    <article className={styles.card}>
      <Link
        href={outingDetailRoute(outing.id)}
        className={styles.cardMainLink}
        aria-label={`Ver ${outing.title}`}
      >
        {/* A date stamp leads the card: the day an outing was chosen or done
            is how people remember it, and it tells cards apart at a glance
            (#134). A cover photo, when there is one, sits behind it. */}
        <time
          dateTime={whenDate.toISOString()}
          className={
            outing.imageUrl
              ? `${styles.stamp} ${styles.stampPhoto}`
              : styles.stamp
          }
        >
          {outing.imageUrl ? (
            <AuthenticatedImage
              url={outing.imageUrl}
              alt=""
              width={160}
              height={160}
              className={styles.stampImage}
            />
          ) : null}
          <span className={styles.stampDay} aria-hidden="true">
            {whenDate.getDate()}
          </span>
          <span className={styles.stampMonth} aria-hidden="true">
            {monthFormatter.format(whenDate).replace(".", "")}
          </span>
          <span className="sp-sr-only">
            {done ? OUTINGS_COPY.doneOn : OUTINGS_COPY.chosenOn}{" "}
            {dateFormatter.format(whenDate)}
          </span>
        </time>

        <div className={styles.cardMain}>
          <h3 className={styles.cardTitle}>{outing.title}</h3>

          {outing.activityNames.length > 0 ? (
            <p className={styles.route} title={routeSummary}>
              {routeSummary}
            </p>
          ) : null}

          <div className={styles.meta}>
            <Badge variant="cost">{formatArs(outing.estimatedTotalCost)}</Badge>
            {outing.estimatedTotalDuration > 0 ? (
              <span className={styles.metaItem}>
                <Icon name="clock" size={13} aria-hidden="true" />
                {formatDuration(outing.estimatedTotalDuration)}
              </span>
            ) : null}
            <span className={styles.metaItem}>
              <Icon name="users" size={13} aria-hidden="true" />
              {OUTINGS_COPY.people(outing.peopleCount)}
            </span>
          </div>

          {outing.source && !outing.source.available ? (
            <p className={styles.sourceNote}>
              <Icon name="info" size={13} aria-hidden="true" />
              {OUTINGS_COPY.sourceUnavailable}
            </p>
          ) : null}
        </div>
      </Link>

      {rated ? (
        <RatedLine feedback={rated} estimated={outing.estimatedTotalCost} />
      ) : null}

      {showInvite ? (
        <div className={styles.cardFeedback}>
          <FeedbackInvite
            planId={outing.id}
            planTitle={outing.title}
            estimatedTotalCost={outing.estimatedTotalCost}
            completedAt={outing.completedAt}
            activityCount={outing.activityCount}
            canShare={outing.source?.hasCommunity ?? false}
            onDismiss={onDismissInvite}
            onSubmitted={(feedback) => onSubmitted(outing.id, feedback)}
            onReconcile={onReconcile}
            onMediaChanged={onReconcile}
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
  const comment = feedback.comment?.trim();
  return (
    <div className={styles.rated}>
      <div className={styles.ratedRow}>
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
      {comment ? (
        <blockquote className={styles.ratedComment}>“{comment}”</blockquote>
      ) : null}
    </div>
  );
}
