import { Badge, Stars } from "@/components/ui";
import { formatArs } from "@/lib/utils";
import type { PlanFeedback } from "@/types";

import {
  costDeltaLabel,
  FEEDBACK_COPY,
  FEEDBACK_TAG_LABELS,
  FEEDBACK_TAG_ORDER,
  ratingLabel,
} from "./feedbackContent";
import styles from "./feedback.module.css";

export interface ExperienceSummaryProps {
  feedback: PlanFeedback;
  /** What SmartPlan estimated — shown next to the real spend for contrast. */
  estimatedTotalCost: number;
}

/**
 * The permanent "Tu experiencia" section on PAN 17 once feedback exists
 * (CU23 · §16). Read-only, no editing. Renders only the parts that have
 * data — no empty comment slot, no invented real cost.
 */
export function ExperienceSummary({
  feedback,
  estimatedTotalCost,
}: ExperienceSummaryProps) {
  const orderedTags = FEEDBACK_TAG_ORDER.filter((tag) =>
    feedback.tags.includes(tag)
  );
  const hasRealCost = feedback.actualCost != null && feedback.actualCost > 0;

  return (
    <section className={styles.experience} aria-label={FEEDBACK_COPY.experience.heading}>
      <p className={styles.expHeading}>{FEEDBACK_COPY.experience.heading}</p>

      <div className={styles.expRatingRow}>
        <Stars rating={feedback.rating} size={18} />
        <span className={styles.expRatingLabel}>
          {ratingLabel(feedback.rating)}
        </span>
      </div>

      {orderedTags.length > 0 ? (
        <div className={styles.expTags}>
          {orderedTags.map((tag) => (
            <Badge key={tag} variant="tag">
              {FEEDBACK_TAG_LABELS[tag]}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className={styles.expCost}>
        <div className={styles.expCostCol}>
          <span className={styles.expCostLabel}>
            {FEEDBACK_COPY.experience.estimatedLabel}
          </span>
          <span className={styles.expCostValue}>
            {formatArs(estimatedTotalCost)}
          </span>
        </div>
        {hasRealCost ? (
          <>
          <div className={styles.expCostCol}>
            <span className={styles.expCostLabel}>
              {FEEDBACK_COPY.experience.realLabel}
            </span>
            <span className={styles.expCostValue}>
              {formatArs(feedback.actualCost as number)}
            </span>
          </div>
          <span className={styles.expDelta}>
            {costDeltaLabel(estimatedTotalCost, feedback.actualCost as number)}
          </span>
          </>
        ) : null}
      </div>

      {feedback.comment ? (
        <p className={styles.expComment}>“{feedback.comment}”</p>
      ) : null}
    </section>
  );
}
