"use client";

import { useId, useState } from "react";

import { Icon } from "@/components/ui";
import { setFeedbackSharing } from "@/lib/api";
import type { PlanFeedback } from "@/types";

import { FEEDBACK_COPY } from "./feedbackContent";
import styles from "./feedback.module.css";

export interface ExperienceSharingProps {
  outingId: number;
  planTitle: string;
  feedback: PlanFeedback;
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
  const copy = FEEDBACK_COPY.sharing;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      onChange(await setFeedbackSharing(outingId, !feedback.shared));
    } catch {
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
            <Icon name={feedback.shared ? "users" : "lock"} size={15} aria-hidden="true" />
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
      {error ? (
        <p className={styles.sharingError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
