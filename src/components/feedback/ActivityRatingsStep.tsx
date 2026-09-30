"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button, Icon, RatingInput } from "@/components/ui";
import { ApiError, createRating, getOwnRating, updateRating } from "@/lib/api";
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

type RowStatus = "open" | "saved" | "error";

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
        score: activity.ownRating?.score ?? 0,
        comment: activity.ownRating?.comment ?? "",
        commentOpen: Boolean(activity.ownRating?.comment),
        status: "open",
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
 * Existing ratings stay editable and are updated through CU46. Only new or
 * changed rows are sent, each on its own, so one failure keeps the others saved.
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
  const rejectedComments = useRef(0);

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  const pending = activities.filter((activity) => {
    const row = rows[activity.id];
    if ((row.status !== "open" && row.status !== "error") || row.score === 0) {
      return false;
    }
    const own = activity.ownRating;
    return own == null || row.score !== own.score || row.comment.trim() !== (own.comment ?? "");
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

    async function save(activity: RatableActivity): Promise<OwnRating> {
      const row = rows[activity.id];
      const comment = row.comment.trim();
      if (activity.ownRating) {
        return updateRating(activity.ownRating.id, {
          score: row.score,
          comment: comment || null,
        });
      }
      try {
        return await createRating(activity.id, {
          planId,
          score: row.score,
          comment: comment || undefined,
        });
      } catch (error) {
        // The lookup and submit can race with another tab. Resolve the current
        // rating and apply this form's value instead of silently discarding it.
        if (error instanceof ApiError && error.code === "RATING_ALREADY_EXISTS") {
          const current = await getOwnRating(activity.id);
          if (current) {
            return updateRating(current.id, {
              score: row.score,
              comment: comment || null,
            });
          }
        }
        throw error;
      }
    }

    const results = await Promise.allSettled(pending.map(save));

    const next = { ...rows };
    const saved: OwnRating[] = [];
    let failed = 0;
    results.forEach((result, index) => {
      const activityId = pending[index].id;
      if (result.status === "fulfilled") {
        saved.push(result.value);
        next[activityId] = { ...next[activityId], status: "saved", error: null };
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
    rejectedComments.current += saved.filter(
      (rating) => rating.moderationStatus === "rejected"
    ).length;

    if (failed > 0) {
      setFormError(ACTIVITY_RATINGS_COPY.errors.partial(failed, pending.length));
      return;
    }
    onSaved({
      rejectedComments: rejectedComments.current,
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
            const done = row.status === "saved";
            return (
              <li key={activity.id} className={styles.activityRow} data-done={done}>
                <div className={styles.activityHead}>
                  <p id={nameId} className={styles.activityName}>{activity.name}</p>
                  {done ? (
                    <span className={styles.activityDone}>
                      <Icon name="check" size={14} aria-hidden="true" />
                      {ACTIVITY_RATINGS_COPY.saved}
                    </span>
                  ) : activity.ownRating ? (
                    <span className={styles.activityDone}>
                      {ACTIVITY_RATINGS_COPY.currentRating}
                    </span>
                  ) : null}
                </div>

                {done ? null : (
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
