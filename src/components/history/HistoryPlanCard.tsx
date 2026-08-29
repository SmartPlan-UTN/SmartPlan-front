import Link from "next/link";

import { FeedbackInvite, ratingLabel } from "@/components/feedback";
import { Badge, Icon, Stars } from "@/components/ui";
import { planDetailRoute } from "@/lib/routes";
import { formatArs } from "@/lib/utils";
import type { OwnPlanSummary, PlanFeedback, PlanStatusKey } from "@/types";

import styles from "./history.module.css";

export interface HistoryPlanCardProps {
  plan: OwnPlanSummary;
  /** "Ahora no" was pressed this session — hide the invite. */
  inviteDismissed: boolean;
  onDismissInvite: () => void;
  onSubmitted: (planId: number, feedback: PlanFeedback) => void;
  onReconcile: () => void;
}

// Matches the plan-detail hero (`statusPresentation.ts`): a finished plan
// reads "Realizado". Only states worth a pill get one.
const STATUS_LABEL: Partial<Record<PlanStatusKey, string>> = {
  completed: "Realizado",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function HistoryPlanCard({
  plan,
  inviteDismissed,
  onDismissInvite,
  onSubmitted,
  onReconcile,
}: HistoryPlanCardProps) {
  const when = plan.completedAt ?? plan.createdAt;
  const statusLabel = STATUS_LABEL[plan.status.key];
  const showInvite =
    plan.feedbackState === "available" && !inviteDismissed;
  const rated =
    plan.feedbackState === "submitted" && plan.feedback
      ? plan.feedback
      : null;

  return (
    <article className={styles.card}>
      <Link
        href={planDetailRoute(plan.id)}
        className={styles.cardLink}
        aria-label={`Ver ${plan.title}`}
      />

      <div className={styles.cardMain}>
        <div className={styles.cardHead}>
          <p className={styles.date}>{dateFormatter.format(new Date(when))}</p>
          <h3 className={styles.cardTitle}>{plan.title}</h3>
        </div>

        <div className={styles.meta}>
          {statusLabel ? (
            <span
              className={
                plan.status.key === "cancelled"
                  ? `${styles.statusPill} ${styles.statusPillMuted}`
                  : styles.statusPill
              }
            >
              {plan.status.key === "completed" ? (
                <Icon name="circle-check" size={12} aria-hidden="true" />
              ) : null}
              {statusLabel}
            </span>
          ) : null}
          <Badge variant="cost">{formatArs(plan.estimatedTotalCost)}</Badge>
          <span className={styles.metaItem}>
            <Icon name="route" size={13} aria-hidden="true" />
            {plan.activityCount}{" "}
            {plan.activityCount === 1 ? "actividad" : "actividades"}
          </span>
        </div>

        {rated ? <RatedLine feedback={rated} estimated={plan.estimatedTotalCost} /> : null}
      </div>

      {showInvite ? (
        <div className={styles.cardFeedback}>
          <FeedbackInvite
            planId={plan.id}
            planTitle={plan.title}
            estimatedTotalCost={plan.estimatedTotalCost}
            completedAt={plan.completedAt ?? plan.createdAt}
            activityCount={plan.activityCount}
            onDismiss={onDismissInvite}
            onSubmitted={(feedback) => onSubmitted(plan.id, feedback)}
            onReconcile={onReconcile}
          />
        </div>
      ) : null}
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
