"use client";

import { useCallback, useState } from "react";

import { RatingInput } from "@/components/ui";
import type { PlanFeedback } from "@/types";

import { FeedbackDialog } from "./FeedbackDialog";
import { FEEDBACK_COPY, RATING_STAR_LABELS } from "./feedbackContent";
import styles from "./feedback.module.css";

export interface FeedbackInviteProps {
  planId: number;
  planTitle: string;
  estimatedTotalCost: number;
  completedAt: string | null;
  activityCount: number;
  onSubmitted: (feedback: PlanFeedback) => void;
  onReconcile?: () => void;
  /** "Ahora no" — the parent hides the invite for the session. Optional. */
  onDismiss?: () => void;
}

/**
 * The non-invasive CU23 prompt: a soft ember card with mini stars. Tapping a
 * star opens {@link FeedbackDialog} with that rating preselected. No red, no
 * warning tone, no obligation copy — it should catch the eye without nagging.
 */
export function FeedbackInvite({
  planId,
  planTitle,
  estimatedTotalCost,
  completedAt,
  activityCount,
  onSubmitted,
  onReconcile,
  onDismiss,
}: FeedbackInviteProps) {
  // `null` closed; a number opens the dialog with that rating preselected.
  const [openRating, setOpenRating] = useState<number | null>(null);

  const handleSubmitted = useCallback(
    (feedback: PlanFeedback) => {
      setOpenRating(null);
      onSubmitted(feedback);
    },
    [onSubmitted]
  );

  return (
    <>
      <div className={styles.invite}>
        <div className={styles.inviteText}>
          <p className={styles.inviteTitle}>{FEEDBACK_COPY.invite.title}</p>
          <p className={styles.inviteSubtitle}>
            {FEEDBACK_COPY.invite.subtitle}
          </p>
        </div>
        <RatingInput
          value={0}
          onChange={(rating) => setOpenRating(rating)}
          labels={RATING_STAR_LABELS}
          size={22}
        />
        {onDismiss ? (
          <button
            type="button"
            className={styles.inviteDismiss}
            onClick={onDismiss}
          >
            {FEEDBACK_COPY.invite.dismiss}
          </button>
        ) : null}
      </div>

      <FeedbackDialog
        key={openRating ?? "closed"}
        open={openRating !== null}
        planId={planId}
        planTitle={planTitle}
        estimatedTotalCost={estimatedTotalCost}
        completedAt={completedAt}
        activityCount={activityCount}
        initialRating={openRating ?? 0}
        onDismiss={() => setOpenRating(null)}
        onSubmitted={handleSubmitted}
        onReconcile={onReconcile}
      />
    </>
  );
}
