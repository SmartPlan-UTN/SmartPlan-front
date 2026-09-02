"use client";

import { useState, type FormEvent } from "react";

import { Button, StarRatingInput } from "@/components/ui";
import { ApiError, updateRating } from "@/lib/api";
import type { OwnRating, UpdateRatingInput } from "@/types";

import styles from "./activity.module.css";

const MAX_COMMENT_LENGTH = 1000;

export interface EditRatingFormProps {
  rating: OwnRating;
  onSaved: (rating: OwnRating) => void;
  onCancel: () => void;
}

interface FieldErrors {
  score?: string;
  comment?: string;
}

/**
 * Generic, user-facing message for each CU46 submit error code.
 * `RATING_NOT_FOUND` covers both "it was deleted" and "it's not yours" —
 * `SmartPlan-back`'s `findOwnRating` scopes the lookup by `idUser`, so a
 * mismatch surfaces the same 404 either way.
 */
function submitErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "RATING_NOT_FOUND":
      return "Esta valoración ya no existe. Recargá la página.";
    case "VALIDATION_FAILED":
      return "Revisá los datos ingresados.";
    default:
      return error.isNetworkError
        ? error.message
        : "No pudimos guardar los cambios. Intentá de nuevo.";
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
 * CU46 - Edit own rating (PAN 18). Like `RatingForm` (CU44), no mockup
 * shows this control — `ActivityDetail.jsx` never lets a reviewer touch
 * their own review — so it's original, reusing the exact same card/field
 * layout as `RatingForm` rather than a variant of it: this codebase keeps
 * create/edit forms as separate, independently-written components (see
 * `CreatePlanForm`/`EditPlanForm`) instead of one form with a mode switch.
 *
 * "Solo el autor puede editarla" (the issue's other line item) needs no
 * extra check here: `ActivityRatingSection` only ever renders this for the
 * signed-in user's own rating, and `PATCH /ratings/:id` re-scopes by
 * `idUser` server-side regardless.
 */
export function EditRatingForm({ rating, onSaved, onCancel }: EditRatingFormProps) {
  const [score, setScore] = useState(rating.score);
  const [comment, setComment] = useState(rating.comment ?? "");
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

    const normalizedComment = comment.trim() || null;
    const originalComment = rating.comment?.trim() || null;
    const changes: UpdateRatingInput = {};

    if (score !== rating.score) {
      changes.score = score;
    }
    if (normalizedComment !== originalComment) {
      changes.comment = normalizedComment;
    }

    if (changes.score === undefined && changes.comment === undefined) {
      onCancel();
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateRating(rating.id, changes);
      onSaved(updated);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(submitErrorMessage(error));
        setFieldErrors(fieldErrorsFrom(error));
      } else {
        setFormError("No pudimos guardar los cambios. Intentá de nuevo.");
      }
      setSubmitting(false);
    }
    // No `finally`: on success, `onSaved` swaps this form back out for the
    // read-only view, so there's nothing left here to re-enable.
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
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
          <label htmlFor="rating-edit-comment" className={`sp-label ${styles.label}`}>
            Comentario
          </label>
        </div>
        <textarea
          id="rating-edit-comment"
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

      <div className={styles.editRatingActions}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghostLight" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
