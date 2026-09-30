"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { Button, Icon, RatingInput, Stars } from "@/components/ui";
import { ApiError, createRating } from "@/lib/api";
import type { RatableActivity } from "@/lib/plans/ratableActivities";
import type { OwnRating } from "@/types";

import { ACTIVITY_RATINGS_COPY } from "./feedbackContent";
import styles from "./feedback.module.css";

const MAX_COMMENT_LENGTH = 1000;

export interface ActivityRatingsResult {
  /** Ratings saved whose comment moderation rejected (CU55). */
  rejectedComments: number;
}

export interface ActivityRatingsStepProps {
  planId: number;
  planTitle: string;
  activities: RatableActivity[];
  /** id the dialog's `aria-labelledby` points to. */
  titleId: string;
  onBusyChange: (busy: boolean) => void;
  onSkip: () => void;
  onSaved: (result: ActivityRatingsResult) => void;
}

type RowStatus = "open" | "saved" | "existing" | "error";

interface Row {
  score: number;
  comment: string;
  commentOpen: boolean;
  status: RowStatus;
  error: string | null;
}

function initialRows(activities: RatableActivity[]): Record<number, Row> {
  return Object.fromEntries(
    activities.map((activity) => [
      activity.id,
      {
        score: activity.ownScore ?? 0,
        comment: "",
        commentOpen: false,
        status: activity.ownScore != null ? "saved" : "open",
        error: null,
      } satisfies Row,
    ])
  );
}

function rowErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return ACTIVITY_RATINGS_COPY.errors.generic;
  switch (error.code) {
    case "RATING_EXPERIENCE_REQUIRED":
    case "PLAN_NOT_FOUND":
      return ACTIVITY_RATINGS_COPY.errors.experience;
    case "ACTIVITY_NOT_FOUND":
      return ACTIVITY_RATINGS_COPY.errors.activityGone;
    case "VALIDATION_FAILED":
      return ACTIVITY_RATINGS_COPY.errors.validation;
    default:
      return error.isNetworkError ? error.message : ACTIVITY_RATINGS_COPY.errors.generic;
  }
}

/**
 * The optional step after CU23's feedback: rate each activity of the outing
 * just reviewed (CU44), one star row per activity, a comment only if wanted.
 * Only the rows with stars are sent, each on its own, so one failure keeps
 * the others saved. Activities already rated show their score, read-only —
 * editing stays on the activity page (CU46).
 */
export function ActivityRatingsStep({
  planId,
  planTitle,
  activities,
  titleId,
  onBusyChange,
  onSkip,
  onSaved,
}: ActivityRatingsStepProps) {
  const baseId = useId();
  const [rows, setRows] = useState(() => initialRows(activities));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  const pending = activities.filter((activity) => {
    const row = rows[activity.id];
    return (row.status === "open" || row.status === "error") && row.score > 0;
  });

  function patchRow(activityId: number, patch: Partial<Row>) {
    setRows((current) => ({
      ...current,
      [activityId]: { ...current[activityId], ...patch },
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || pending.length === 0) return;
    setBusy(true);
    setFormError(null);

    const results = await Promise.allSettled(
      pending.map((activity) => {
        const row = rows[activity.id];
        return createRating(activity.id, {
          planId,
          score: row.score,
          comment: row.comment.trim() || undefined,
        });
      })
    );

    const next = { ...rows };
    const saved: OwnRating[] = [];
    let failed = 0;
    results.forEach((result, index) => {
      const activityId = pending[index].id;
      if (result.status === "fulfilled") {
        saved.push(result.value);
        next[activityId] = { ...next[activityId], status: "saved", error: null };
      } else if (
        result.reason instanceof ApiError &&
        result.reason.code === "RATING_ALREADY_EXISTS"
      ) {
        next[activityId] = { ...next[activityId], status: "existing", error: null };
      } else {
        failed += 1;
        next[activityId] = {
          ...next[activityId],
          status: "error",
          error: rowErrorMessage(result.reason),
        };
      }
    });
    setRows(next);
    setBusy(false);

    if (failed > 0) {
      setFormError(ACTIVITY_RATINGS_COPY.errors.partial(failed, pending.length));
      return;
    }
    onSaved({
      rejectedComments: saved.filter((rating) => rating.moderationStatus === "rejected")
        .length,
    });
  }

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className={styles.formScroll}>
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>{ACTIVITY_RATINGS_COPY.heading}</h2>
          <div className={styles.planContext}>
            <p className={styles.planName}>{planTitle}</p>
            <p className={styles.planMeta}>{ACTIVITY_RATINGS_COPY.lead}</p>
          </div>
        </header>

        <ul className={styles.activityList}>
          {activities.map((activity) => {
            const row = rows[activity.id];
            const nameId = `${baseId}-${activity.id}-name`;
            const commentId = `${baseId}-${activity.id}-comment`;
            const done = row.status === "saved" || row.status === "existing";
            return (
              <li key={activity.id} className={styles.activityRow} data-done={done}>
                <div className={styles.activityHead}>
                  <p id={nameId} className={styles.activityName}>{activity.name}</p>
                  {done ? (
                    <span className={styles.activityDone}>
                      <Icon name="check" size={14} aria-hidden="true" />
                      {row.status === "existing" || activity.ownScore != null
                        ? ACTIVITY_RATINGS_COPY.alreadyRated
                        : ACTIVITY_RATINGS_COPY.saved}
                    </span>
                  ) : null}
                </div>

                {done ? (
                  row.status === "saved" ? <Stars rating={row.score} size={18} /> : null
                ) : (
                  <>
                    <RatingInput
                      value={row.score}
                      onChange={(score) => patchRow(activity.id, { score, error: null })}
                      labelledBy={nameId}
                      disabled={busy}
                      required={false}
                      size={30}
                    />
                    {row.score > 0 ? (
                      row.commentOpen ? (
                        <div className={styles.activityComment}>
                          <label htmlFor={commentId} className={styles.srOnly}>
                            {ACTIVITY_RATINGS_COPY.commentLabel(activity.name)}
                          </label>
                          <textarea
                            id={commentId}
                            className={`${styles.textarea} sp-textarea-light`}
                            rows={2}
                            maxLength={MAX_COMMENT_LENGTH}
                            value={row.comment}
                            disabled={busy}
                            placeholder={ACTIVITY_RATINGS_COPY.commentPlaceholder}
                            onChange={(event) =>
                              patchRow(activity.id, { comment: event.target.value })
                            }
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.commentToggle}
                          disabled={busy}
                          onClick={() => patchRow(activity.id, { commentOpen: true })}
                        >
                          <Icon name="pencil" size={15} aria-hidden="true" />
                          <span>{ACTIVITY_RATINGS_COPY.commentToggle}</span>
                          <span className={styles.hint}>Opcional</span>
                        </button>
                      )
                    ) : null}
                    {row.error ? (
                      <p className={styles.error} role="alert">{row.error}</p>
                    ) : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
      </div>

      <footer className={styles.actions}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className={styles.submitButton}
          disabled={busy || pending.length === 0}
        >
          {busy ? (
            <><Icon name="loader-circle" size={17} className="sp-spin" />{ACTIVITY_RATINGS_COPY.submitting}</>
          ) : ACTIVITY_RATINGS_COPY.submit}
        </Button>
        <button
          type="button"
          className={styles.dismissButton}
          onClick={onSkip}
          disabled={busy}
        >
          {ACTIVITY_RATINGS_COPY.skip}
        </button>
      </footer>
    </form>
  );
}
