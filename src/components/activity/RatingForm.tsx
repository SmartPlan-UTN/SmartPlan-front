"use client";

import { useState, type FormEvent } from "react";

import { Button, StarRatingInput } from "@/components/ui";
import { ApiError, createRating } from "@/lib/api";
import type { OwnRating } from "@/types";

import styles from "./activity.module.css";

const MAX_COMMENT_LENGTH = 1000;

export interface RatingFormProps {
  activityId: number;
  /** Resolved by `ActivityRatingSection` before this form ever renders —
   * see its doc comment for how. */
  planId: number;
  onSubmitted: (rating: OwnRating) => void;
}

interface FieldErrors {
  score?: string;
  comment?: string;
}

/**
 * Generic, user-facing message for each CU44 submit error code.
 * `RATING_ALREADY_EXISTS` isn't mapped here: `ActivityRatingSection`
 * already prevents this form from rendering once a rating exists, so a
 * 409 with that code only means it was created from another tab in the
 * meantime — handled by the caller re-fetching, not a form-level message.
 */
function submitErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "RATING_EXPERIENCE_REQUIRED":
    case "PLAN_NOT_FOUND":
      return "No pudimos verificar tu experiencia con esta actividad. Actualizá la página e intentá de nuevo.";
    case "ACTIVITY_NOT_FOUND":
      return "Esta actividad ya no está disponible.";
    case "VALIDATION_FAILED":
      return "Revisá los datos ingresados.";
    default:
      return error.isNetworkError
        ? error.message
        : "No pudimos enviar tu valoración. Intentá de nuevo.";
  }
}

function fieldErrorsFrom(error: ApiError): FieldErrors {
  const rawErrors = error.data?.errors;
  if (!Array.isArray(rawErrors)) {
    return {};
  }

  const fieldErrors: FieldErrors = {};

  for (const item of rawErrors) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const detail = item as Record<string, unknown>;
    const message =
      Array.isArray(detail.messages) && typeof detail.messages[0] === "string"
        ? detail.messages[0]
        : undefined;

    if (!message) {
      continue;
    }

    if (detail.field === "score") {
      fieldErrors.score = message;
    } else if (detail.field === "comment") {
      fieldErrors.comment = message;
    }
  }

  return fieldErrors;
}

function validate(score: number, comment: string): FieldErrors {
  const errors: FieldErrors = {};

  if (score < 1) {
    errors.score = "Seleccioná un puntaje";
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    errors.comment = `Máximo ${MAX_COMMENT_LENGTH} caracteres`;
  }

  return errors;
}

/**
 * CU44 - Rate activity (PAN 18): the score + comment form itself, per the
 * issue's own scope ("Formulario de valoracion: puntaje y comentario").
 * No mockup shows this control at all — `ActivityDetail.jsx`'s
 * "Valoraciones" tab only ever displays ratings, never writes one — so its
 * layout (a card with the star picker, a comment textarea, and a submit
 * row) is original, following the hand-rolled label/input pattern
 * `CreatePlanForm`'s "General details" card already established for a
 * non-auth form in this app, not the auth screens' `AuthField`.
 */
export function RatingForm({ activityId, planId, onSubmitted }: RatingFormProps) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setFormError(null);

    const errors = validate(score, comment.trim());
    setFieldErrors(errors);
    if (errors.score || errors.comment) {
      return;
    }

    setSubmitting(true);
    try {
      const rating = await createRating(activityId, {
        planId,
        score,
        comment: comment.trim() || undefined,
      });
      onSubmitted(rating);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(submitErrorMessage(error));
        setFieldErrors(fieldErrorsFrom(error));
      } else {
        setFormError("No pudimos enviar tu valoración. Intentá de nuevo.");
      }
      setSubmitting(false);
    }
    // No `finally`: on success, `onSubmitted` swaps this form out for the
    // "already rated" view, so there's nothing left here to re-enable.
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <div className={styles.ratingFormCard}>
      <p className={styles.ratingFormTitle}>Dejá tu valoración</p>

      <form className={styles.ratingForm} onSubmit={handleSubmit} noValidate>
        {formError ? (
          <p className={styles.fieldError} role="alert">
            {formError}
          </p>
        ) : null}

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <span className={`sp-label ${styles.label}`}>Tu puntaje</span>
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          </div>
          <StarRatingInput
            label="Tu puntaje"
            value={score}
            onChange={(value) => {
              setScore(value);
              setFieldErrors((current) => ({ ...current, score: undefined }));
            }}
            disabled={submitting}
            size={30}
          />
          {fieldErrors.score ? (
            <p className={styles.fieldError}>{fieldErrors.score}</p>
          ) : null}
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="rating-comment" className={`sp-label ${styles.label}`}>
              Comentario
            </label>
          </div>
          <textarea
            id="rating-comment"
            className={[styles.textarea, fieldErrors.comment ? styles.inputInvalid : ""].join(
              " ",
            )}
            placeholder="Contanos cómo fue tu experiencia (opcional)"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
            }}
            disabled={submitting}
            maxLength={MAX_COMMENT_LENGTH}
          />
          {fieldErrors.comment ? (
            <p className={styles.fieldError}>{fieldErrors.comment}</p>
          ) : null}
        </div>

        <Button type="submit" disabled={submitting} className={styles.ratingSubmit}>
          {submitting ? "Enviando…" : "Enviar valoración"}
        </Button>
      </form>
    </div>
  );
}
