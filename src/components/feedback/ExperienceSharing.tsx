"use client";

import { useId, useState } from "react";
import Link from "next/link";

import { Icon, Stars } from "@/components/ui";
import { ApiError, setFeedbackSharing } from "@/lib/api";
import { communityExperienceRoute } from "@/lib/routes";
import type { PlanFeedback } from "@/types";

import { FEEDBACK_COPY } from "./feedbackContent";
import styles from "./feedback.module.css";

export interface ExperienceSharingProps {
  outingId: number;
  planTitle: string;
  feedback: PlanFeedback;
  /**
   * Legacy caller compatibility. Global experience consent is independent
   * of whether the source plan is published.
   */
  published?: boolean;
  onChange: (feedback: PlanFeedback) => void;
}

/**
 * Public or private, at any time (#106). Making it private deletes nothing:
 * it only stops showing in the plan's community, and sharing it again brings
 * it back as it was. The backend answer is the only source of the new state.
 */
export function ExperienceSharing({
  outingId,
  planTitle,
  feedback,
  onChange,
}: ExperienceSharingProps) {
  const descriptionId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingReviewId, setExistingReviewId] = useState<number | null>(null);
  const copy = FEEDBACK_COPY.sharing;

  async function toggle() {
    setBusy(true);
    setError(null);
    setExistingReviewId(null);
    try {
      onChange(await setFeedbackSharing(outingId, !feedback.shared));
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : null;
      const existingId = apiError?.data?.existingExperienceId;
      if (apiError?.code === "COMMUNITY_REVIEW_ALREADY_EXISTS" && typeof existingId === "number") {
        setExistingReviewId(existingId);
      }
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.sharing}>
      <div className={styles.sharingRow}>
        <div className={styles.sharingText}>
          <span className={styles.sharingTitle}>
            <Icon
              name={feedback.shared ? "users" : "lock"}
              size={15}
              aria-hidden="true"
            />
            {feedback.shared ? copy.publicTitle : copy.privateTitle}
          </span>
          <span id={descriptionId} className={styles.sharingBody}>
            {feedback.shared ? copy.publicBody(planTitle) : copy.privateBody}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={feedback.shared}
          aria-label={copy.switchLabel}
          aria-describedby={descriptionId}
          className={styles.switch}
          disabled={busy}
          onClick={() => void toggle()}
        >
          <span className={styles.switchThumb} aria-hidden="true" />
        </button>
      </div>
      {!feedback.shared ? (
        <details className={styles.publicPreview}>
          <summary>Vista previa de tu experiencia</summary>
          <Stars rating={feedback.rating} size={16} />
          {feedback.comment ? <p>{feedback.comment}</p> : null}
          <p>
            Tu usuario, tu puntuación y las fotos propias de la salida. No se
            publica lo que gastaste ni un recorrido privado.
          </p>
        </details>
      ) : null}
      {feedback.existingCommunityExperienceId ? (
        <div className={styles.sharingExisting} role="status">
          <p>Ya tenés una reseña pública de este plan. Esta salida quedó guardada en privado.</p>
          <Link href={communityExperienceRoute(feedback.existingCommunityExperienceId)}>
            Abrir tu reseña y sumar esta salida
          </Link>
        </div>
      ) : null}
      {error ? (
        <div className={styles.sharingError} role="alert">
          <p>{error}</p>
          {existingReviewId ? (
            <Link href={communityExperienceRoute(existingReviewId)}>
              Abrir tu reseña y sumar esta salida
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
