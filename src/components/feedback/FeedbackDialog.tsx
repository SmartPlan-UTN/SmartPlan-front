"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import { MediaGalleryManager } from "@/components/media";
import { Button, Icon, RatingInput } from "@/components/ui";
import { useFeedbackSubmit } from "@/hooks";
import {
  loadRatableActivities,
  type RatableActivity,
} from "@/lib/plans/ratableActivities";
import { formatArs } from "@/lib/utils";
import type { FeedbackTag, PlanFeedback } from "@/types";

import {
  ActivityRatingsStep,
  type ActivityRatingsResult,
} from "./ActivityRatingsStep";
import {
  ACTIVITY_RATINGS_COPY,
  costDeltaLabel,
  FEEDBACK_COPY,
  FEEDBACK_TAG_LABELS,
  FEEDBACK_TAG_ORDER,
  RATING_LABELS,
  RATING_STAR_LABELS,
} from "./feedbackContent";
import styles from "./feedback.module.css";

export interface FeedbackDialogProps {
  open: boolean;
  planId: number;
  planTitle: string;
  estimatedTotalCost: number;
  completedAt: string | null;
  activityCount: number;
  initialRating?: number;
  onDismiss: () => void;
  onSubmitted: (feedback: PlanFeedback) => void;
  onReconcile?: () => void;
  /** Refresh surfaces that also show the outing's photos or cover. */
  onMediaChanged?: () => void;
  /**
   * The outing comes from a published plan, so its experience can be
   * shared with that plan's community (#106).
   */
  canShare?: boolean;
}

const SUCCESS_HOLD_MS = 1600;
/** How long the thanks shows on its own before the photos step. */
const PHOTOS_DELAY_MS = 1100;
const NOTICE_HOLD_MS = 4200;
const EXIT_MS = 240;
const MAX_ACTUAL_COST = 99_999_999.99;
const MAX_COST_INPUT_LENGTH = 16;
const MAX_COMMENT_LENGTH = 1000;
const COMMENT_COUNTER_THRESHOLD = 800;
const FOCUSABLE =
  'button:not(:disabled):not([tabindex="-1"]), [href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function formatCompletedAt(value: string): string {
  const parts = dateFormatter.formatToParts(new Date(value));
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value.replace(".", "") ?? "";
  return `${day} ${month}`.trim();
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

function sanitizeCostInput(raw: string): string {
  const clean = raw.replace(/[^\d.,]/g, "");
  if (!/\d/.test(clean) && !clean.includes(",")) return "";
  const commaIndex = clean.indexOf(",");
  const integerSource = commaIndex >= 0 ? clean.slice(0, commaIndex) : clean;
  const decimalSource = commaIndex >= 0 ? clean.slice(commaIndex + 1) : "";
  const integerDigits = integerSource.replace(/\D/g, "").slice(0, 10);
  const decimalDigits = decimalSource.replace(/\D/g, "").slice(0, 2);
  const normalizedInteger = integerDigits.replace(/^0+(?=\d)/, "") || "0";
  const groupedInteger = normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return commaIndex >= 0 ? `${groupedInteger},${decimalDigits}` : groupedInteger;
}

function sanitizeComment(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, MAX_COMMENT_LENGTH);
}

export function FeedbackDialog({
  open,
  planId,
  planTitle,
  estimatedTotalCost,
  completedAt,
  activityCount,
  initialRating = 0,
  onDismiss,
  onSubmitted,
  onReconcile,
  onMediaChanged,
  canShare = false,
}: FeedbackDialogProps) {
  const titleId = useId();
  const ratingLabelId = useId();
  const tagsLabelId = useId();
  const costErrorId = useId();
  const submission = useFeedbackSubmit();
  const [rating, setRating] = useState(initialRating);
  const [preview, setPreview] = useState(initialRating);
  const [tags, setTags] = useState<Set<FeedbackTag>>(() => new Set());
  const [costRaw, setCostRaw] = useState("");
  const [costInputError, setCostInputError] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [shared, setShared] = useState(false);
  // form → success → photos of the outing, then either closes or offers
  // rating the activities (offer → activities → ratingsDone, where each rated
  // activity can take photos too). Past `form` the feedback is saved, so
  // every way out reports it through `onSubmitted`.
  const [phase, setPhase] = useState<
    "form" | "success" | "photos" | "offer" | "activities" | "ratingsDone"
  >("form");
  const [ratable, setRatable] = useState<RatableActivity[]>([]);
  const [ratingsBusy, setRatingsBusy] = useState(false);
  const [ratingsResult, setRatingsResult] = useState<ActivityRatingsResult | null>(null);
  const savedFeedback = useRef<PlanFeedback | null>(null);
  const activeRef = useRef(false);
  const [presence, setPresence] = useState<"open" | "closing">("open");
  const dialogRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const successTimer = useRef<number | null>(null);
  const commentFocusFrame = useRef<number | null>(null);
  const busy = submission.status === "working";
  const dismissableRef = useRef(true);
  dismissableRef.current =
    presence === "open" &&
    (phase === "form"
      ? !busy
      : phase === "activities"
        ? !ratingsBusy
        : phase !== "success");
  const dismissActionRef = useRef(onDismiss);
  dismissActionRef.current = phase === "form" ? onDismiss : finishSubmitted;

  function requestClose(callback: () => void) {
    if (presence === "closing") return;
    setPresence("closing");
    closeTimer.current = window.setTimeout(callback, EXIT_MS);
  }

  function finishSubmitted() {
    const feedback = savedFeedback.current;
    if (feedback) onSubmitted(feedback);
  }

  function holdThenClose(ms: number) {
    if (!activeRef.current) return;
    successTimer.current = window.setTimeout(() => {
      requestClose(finishSubmitted);
    }, ms);
  }

  useEffect(() => {
    if (!open) return;
    setRating(initialRating);
    setPreview(initialRating);
    setTags(new Set());
    setCostRaw("");
    setCostInputError(null);
    setCommentOpen(false);
    setComment("");
    setPhase("form");
    setRatable([]);
    setRatingsBusy(false);
    setRatingsResult(null);
    savedFeedback.current = null;
    activeRef.current = true;
    setPresence("open");
    submission.reset();
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      document.documentElement.clientWidth > 0
        ? window.innerWidth - document.documentElement.clientWidth
        : 0;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const raf = requestAnimationFrame(() => {
      const selected = dialogRef.current?.querySelector<HTMLElement>(
        '[role="radio"][aria-checked="true"]'
      );
      const first = dialogRef.current?.querySelector<HTMLElement>('[role="radio"]');
      (selected ?? first)?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissableRef.current) {
        event.preventDefault();
        requestClose(dismissActionRef.current);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
      if (successTimer.current != null) window.clearTimeout(successTimer.current);
      if (commentFocusFrame.current != null) cancelAnimationFrame(commentFocusFrame.current);
      previouslyFocused.current?.focus?.();
    };
    // Opening intentionally snapshots the rating and focus origin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Each later step takes focus where its next action is.
  useEffect(() => {
    if (phase !== "photos" && phase !== "offer" && phase !== "activities") return;
    const frame = requestAnimationFrame(() => {
      const target =
        phase === "photos"
          ? dialogRef.current?.querySelector<HTMLElement>("[data-photos-next]")
          : phase === "offer"
          ? dialogRef.current?.querySelector<HTMLElement>("[data-offer-accept]")
          : dialogRef.current?.querySelector<HTMLElement>('[role="radio"]:not(:disabled)');
      target?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const parsedCost = useMemo(() => parseAmount(costRaw), [costRaw]);
  const costError =
    costInputError ??
    (costRaw.trim() !== "" &&
    (parsedCost === null || Number.isNaN(parsedCost) || parsedCost <= 0)
      ? FEEDBACK_COPY.dialog.costError
      : parsedCost != null && parsedCost > MAX_ACTUAL_COST
        ? FEEDBACK_COPY.dialog.costMaxError
        : null);
  const costFilledButInvalid = costError != null;
  const deltaLabel =
    parsedCost && parsedCost > 0 && !Number.isNaN(parsedCost)
      ? costDeltaLabel(estimatedTotalCost, parsedCost)
      : null;

  if (!open || typeof document === "undefined") return null;

  function toggleTag(tag: FeedbackTag) {
    setTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function openComment() {
    if (commentOpen) return;
    setCommentOpen(true);
    commentFocusFrame.current = requestAnimationFrame(() => {
      commentRef.current?.focus({ preventScroll: true });
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (rating === 0 || busy) return;
    if (costFilledButInvalid) {
      dialogRef.current?.querySelector<HTMLInputElement>("#feedback-cost")?.focus();
      return;
    }
    const outcome = await submission.submit(planId, {
      rating,
      tags: tags.size > 0 ? [...tags] : undefined,
      comment: comment.trim() || undefined,
      shared: canShare && shared ? true : undefined,
      actualCost:
        parsedCost && parsedCost > 0 && !Number.isNaN(parsedCost)
          ? Math.round(parsedCost * 100) / 100
          : undefined,
    });
    if (!outcome) return;
    if (!outcome.ok) {
      if (outcome.error.reconcile) onReconcile?.();
      return;
    }
    savedFeedback.current = outcome.feedback;
    setPhase("success");

    // Photos of the outing come next, always (they're optional). The offer
    // to rate activities follows only if there's something to rate.
    const startedAt = Date.now();
    const activities = await loadRatableActivities(planId).catch(
      (): RatableActivity[] => []
    );
    if (!activeRef.current) return;
    setRatable(activities);
    // Let the thanks land before the next question.
    const wait = Math.max(0, PHOTOS_DELAY_MS - (Date.now() - startedAt));
    successTimer.current = window.setTimeout(() => {
      if (activeRef.current) setPhase("photos");
    }, wait);
  }

  function continueAfterPhotos() {
    if (ratable.length > 0) setPhase("offer");
    else requestClose(finishSubmitted);
  }

  function handleRatingsSaved(result: ActivityRatingsResult) {
    setRatingsResult(result);
    setPhase("ratingsDone");
    // With ratings to attach photos to, the person closes it when done.
    if (result.ratings.length === 0) {
      holdThenClose(result.rejectedComments > 0 ? NOTICE_HOLD_MS : SUCCESS_HOLD_MS);
    }
  }

  const shownRating = preview || rating;
  const apiError = submission.status === "error" ? submission.error : null;
  const dateLabel = completedAt ? formatCompletedAt(completedAt) : null;
  const activityLabel = Number.isFinite(activityCount)
    ? `${activityCount} ${activityCount === 1 ? "actividad" : "actividades"}`
    : null;

  return createPortal(
    <div
      className={styles.overlay}
      data-state={presence}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissableRef.current) {
          requestClose(dismissActionRef.current);
        }
      }}
    >
      <div
        ref={dialogRef}
        className={styles.sheet}
        data-state={presence}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {phase === "activities" ? (
          <ActivityRatingsStep
            planId={planId}
            planTitle={planTitle}
            activities={ratable}
            titleId={titleId}
            onBusyChange={setRatingsBusy}
            onSkip={() => requestClose(finishSubmitted)}
            onSaved={handleRatingsSaved}
          />
        ) : phase === "ratingsDone" ? (
          <div className={ratingsResult && ratingsResult.ratings.length > 0 ? styles.followUp : styles.success}>
            <div className={styles.successMessage} role="status" aria-live="polite">
              <span className={styles.successMark} aria-hidden="true">
                <Icon name="check" size={28} />
              </span>
              <p id={titleId} className={styles.successTitle}>
                {ACTIVITY_RATINGS_COPY.done.title}
              </p>
              <p className={styles.successBody}>
                {ratingsResult && ratingsResult.rejectedComments > 0
                  ? ACTIVITY_RATINGS_COPY.done.rejectedBody
                  : ACTIVITY_RATINGS_COPY.done.body}
              </p>
            </div>
            {ratingsResult && ratingsResult.ratings.length > 0 ? (
              <div className={styles.photoPanel}>
                <p className={styles.offerQuestion}>{ACTIVITY_RATINGS_COPY.done.photosTitle}</p>
                <p className={styles.offerBody}>{ACTIVITY_RATINGS_COPY.done.photosBody}</p>
                <ul className={styles.photoActivities}>
                  {ratingsResult.ratings.map((rated) => (
                    <li key={rated.ratingId} className={styles.photoActivity}>
                      <p className={styles.photoActivityName}>{rated.activityName}</p>
                      <MediaGalleryManager
                        target="rating"
                        resourceId={rated.ratingId}
                        resourceName={`tu valoración de ${rated.activityName}`}
                        variant="compact"
                      />
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className={styles.photoNext}
                  onClick={() => requestClose(finishSubmitted)}
                >
                  {ACTIVITY_RATINGS_COPY.done.finish}
                </Button>
              </div>
            ) : null}
          </div>
        ) : phase === "photos" ? (
          <div className={styles.followUp}>
            <div className={styles.successInline} role="status" aria-live="polite">
              <span className={styles.successMarkSmall} aria-hidden="true">
                <Icon name="check" size={18} />
              </span>
              <span>{FEEDBACK_COPY.success.title}</span>
            </div>
            <div className={styles.photoPanel}>
              <span className={styles.photoPanelIcon} aria-hidden="true">
                <Icon name="camera" size={22} />
              </span>
              <h2 id={titleId} className={styles.photoTitle}>{FEEDBACK_COPY.photos.title}</h2>
              <p className={styles.offerBody}>{FEEDBACK_COPY.photos.body}</p>
              <div className={styles.photoManager}>
                <MediaGalleryManager
                  target="plan"
                  resourceId={planId}
                  resourceName={planTitle}
                  variant="embedded"
                  onChanged={onMediaChanged}
                />
              </div>
              <div className={styles.offerActions}>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  data-photos-next=""
                  onClick={continueAfterPhotos}
                >
                  {ratable.length > 0 ? FEEDBACK_COPY.photos.next : FEEDBACK_COPY.photos.done}
                </Button>
                <button
                  type="button"
                  className={styles.dismissButton}
                  onClick={continueAfterPhotos}
                >
                  {FEEDBACK_COPY.photos.skip}
                </button>
              </div>
            </div>
          </div>
        ) : phase === "success" || phase === "offer" ? (
          <div className={styles.success}>
            {phase === "success" ? (
              <div className={styles.successMessage} role="status" aria-live="polite">
                <span className={styles.successMark} aria-hidden="true">
                  <Icon name="check" size={28} />
                </span>
                <p id={titleId} className={styles.successTitle}>{FEEDBACK_COPY.success.title}</p>
                <p className={styles.successBody}>{FEEDBACK_COPY.success.body}</p>
              </div>
            ) : null}
            {phase === "offer" ? (
              <div className={styles.offer}>
                <p id={titleId} className={styles.offerQuestion}>{ACTIVITY_RATINGS_COPY.offer.question}</p>
                <p className={styles.offerBody}>{ACTIVITY_RATINGS_COPY.offer.body}</p>
                <div className={styles.offerActions}>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    data-offer-accept=""
                    onClick={() => setPhase("activities")}
                  >
                    <Icon name="star" size={17} aria-hidden="true" />
                    {ACTIVITY_RATINGS_COPY.offer.accept}
                  </Button>
                  <button
                    type="button"
                    className={styles.dismissButton}
                    onClick={() => requestClose(finishSubmitted)}
                  >
                    {ACTIVITY_RATINGS_COPY.offer.decline}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
            <div className={styles.formScroll}>
              <header className={styles.head}>
                <h2 id={titleId} className={styles.title}>{FEEDBACK_COPY.dialog.heading}</h2>
                <div className={styles.planContext}>
                  <p className={styles.planName}>{planTitle}</p>
                  <p className={styles.planMeta}>
                    {dateLabel ? <span>{dateLabel}</span> : null}
                    {dateLabel && activityLabel ? <span aria-hidden="true">·</span> : null}
                    {activityLabel ? <span>{activityLabel}</span> : null}
                  </p>
                </div>
              </header>

              <div className={styles.ratingBlock}>
                <span id={ratingLabelId} className={styles.srOnly}>{FEEDBACK_COPY.dialog.ratingLabel}</span>
                <RatingInput
                  value={rating}
                  onChange={setRating}
                  onPreview={setPreview}
                  labels={RATING_STAR_LABELS}
                  labelledBy={ratingLabelId}
                  disabled={busy}
                  size={46}
                />
                <p className={styles.ratingCaption} aria-hidden={shownRating === 0}>
                  {shownRating > 0 ? RATING_LABELS[shownRating - 1] : " "}
                </p>
                <p className={styles.ratingGuidance} aria-live="polite">
                  {rating > 0
                    ? FEEDBACK_COPY.dialog.ratingReady
                    : FEEDBACK_COPY.dialog.ratingPrompt}
                </p>
              </div>

              {rating > 0 ? (
                <div className={styles.extras}>
                  <div
                    className={`${styles.field} ${styles.tagsField}`}
                    role="group"
                    aria-labelledby={tagsLabelId}
                  >
                    <div id={tagsLabelId} className={styles.fieldLabel}>
                      {rating <= 2 ? FEEDBACK_COPY.dialog.lowRatingTagsLabel : FEEDBACK_COPY.dialog.tagsLabel}
                      <span className={styles.hint}>{FEEDBACK_COPY.dialog.tagsHint}</span>
                    </div>
                    <div className={styles.chips}>
                      {FEEDBACK_TAG_ORDER.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={styles.tagChoice}
                          aria-pressed={tags.has(tag)}
                          disabled={busy}
                          onPointerDown={(event) => {
                            if (event.button === 0) toggleTag(tag);
                          }}
                          onClick={(event) => {
                            if (event.detail === 0) toggleTag(tag);
                          }}
                        >
                          <span className={styles.tagCheck} aria-hidden="true">
                            <Icon name="check" size={14} />
                          </span>
                          <span>{FEEDBACK_TAG_LABELS[tag]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`${styles.field} ${styles.costField}`}>
                    <div className={styles.fieldLabel}>
                      <span>Costo</span>
                      <span className={styles.hint}>{FEEDBACK_COPY.dialog.costHint}</span>
                    </div>
                    <div className={styles.estimated}>
                      <span className={styles.estimatedLabel}>{FEEDBACK_COPY.dialog.estimatedLabel}</span>
                      <span className={styles.estimatedValue}>{formatArs(estimatedTotalCost)}</span>
                    </div>
                    <label className={styles.realCostLabel} htmlFor="feedback-cost">
                      {FEEDBACK_COPY.dialog.costLabel}
                    </label>
                    <div className={styles.moneyInput}>
                      <span aria-hidden="true">$</span>
                      <input
                        id="feedback-cost"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="33.000"
                        value={costRaw}
                        disabled={busy}
                        aria-invalid={costError != null}
                        aria-describedby={costError != null ? costErrorId : undefined}
                        maxLength={MAX_COST_INPUT_LENGTH}
                        onChange={(event) => {
                          const raw = event.target.value;
                          setCostRaw(sanitizeCostInput(raw));
                          setCostInputError(
                            raw.includes("-") ? FEEDBACK_COPY.dialog.costError : null
                          );
                        }}
                      />
                    </div>
                    <div className={styles.costStatus}>
                      {costError != null ? (
                        <p id={costErrorId} className={styles.error} role="alert">{costError}</p>
                      ) : deltaLabel != null ? (
                        <p className={styles.delta}>{deltaLabel}</p>
                      ) : (
                        <span aria-hidden="true">&nbsp;</span>
                      )}
                    </div>
                  </div>

                  <div className={`${styles.field} ${styles.commentField}`}>
                    {commentOpen ? (
                      <div className={styles.commentHeading}>
                        <Icon name="pencil" size={15} aria-hidden="true" />
                        <label htmlFor="feedback-comment">
                          {FEEDBACK_COPY.dialog.commentLabel}
                        </label>
                        <span className={styles.hint}>Opcional</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.commentToggle}
                        aria-expanded="false"
                        aria-controls="feedback-comment-panel"
                        onClick={openComment}
                        disabled={busy}
                      >
                        <Icon name="pencil" size={15} aria-hidden="true" />
                        <span>{FEEDBACK_COPY.dialog.commentToggle}</span>
                        <span className={styles.hint}>Opcional</span>
                      </button>
                    )}
                    <div id="feedback-comment-panel" className={styles.commentPanel} data-open={commentOpen}>
                      {commentOpen ? (
                        <div>
                          <textarea
                            ref={commentRef}
                            id="feedback-comment"
                            className={`${styles.textarea} sp-textarea-light`}
                            rows={3}
                            maxLength={MAX_COMMENT_LENGTH}
                            value={comment}
                            disabled={busy}
                            placeholder={FEEDBACK_COPY.dialog.commentPlaceholder}
                            onChange={(event) => setComment(sanitizeComment(event.target.value))}
                          />
                          {comment.length >= COMMENT_COUNTER_THRESHOLD ? (
                            <div className={styles.commentMeta}>
                              <span
                                className={styles.commentCount}
                                data-near-limit={comment.length >= 950}
                                aria-live="polite"
                              >
                                {comment.length}/{MAX_COMMENT_LENGTH}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {canShare ? (
                    <div className={`${styles.field} ${styles.shareField}`}>
                      <label className={styles.shareChoice} htmlFor="feedback-share">
                        <input
                          id="feedback-share"
                          type="checkbox"
                          className={styles.shareInput}
                          checked={shared}
                          disabled={busy}
                          aria-describedby="feedback-share-body"
                          onChange={(event) => setShared(event.target.checked)}
                        />
                        <span className={styles.shareBox} aria-hidden="true">
                          <Icon name="check" size={14} />
                        </span>
                        <span className={styles.shareText}>
                          <span className={styles.shareLabel}>
                            <Icon name="users" size={15} aria-hidden="true" />
                            {FEEDBACK_COPY.share.label}
                            <span className={styles.hint}>{FEEDBACK_COPY.share.hint}</span>
                          </span>
                          <span id="feedback-share-body" className={styles.shareBody}>
                            {FEEDBACK_COPY.share.body} {FEEDBACK_COPY.share.later}
                          </span>
                        </span>
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {apiError != null ? <p className={styles.formError} role="alert">{apiError.message}</p> : null}
            </div>

            <footer className={styles.actions}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className={styles.submitButton}
                disabled={rating === 0 || busy || costFilledButInvalid}
              >
                {busy ? (
                  <><Icon name="loader-circle" size={17} className="sp-spin" />{FEEDBACK_COPY.dialog.submitting}</>
                ) : FEEDBACK_COPY.dialog.submit}
              </Button>
              <button
                type="button"
                className={styles.dismissButton}
                onClick={() => requestClose(onDismiss)}
                disabled={busy}
              >
                {FEEDBACK_COPY.dialog.dismiss}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
