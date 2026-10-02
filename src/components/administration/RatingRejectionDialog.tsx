"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";

import styles from "./AdminRatings.module.css";
import shared from "./AdminManagement.module.css";

/** Same ceiling as `ModerateRatingDto`'s `@MaxLength(500)` in `SmartPlan-back`. */
const MAX_REASON_LENGTH = 500;

interface RatingRejectionDialogProps {
  /** e.g. "Rechazar valoración". */
  title: string;
  /** Whose content and where, under the title. */
  subtitle: string;
  placeholder: string;
  /** What rejecting does, said before confirming. */
  note: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

/**
 * Asks for the reason a rating (CU55) or a shared experience's comment or
 * photo (#106) is rejected.
 *
 * `ConfirmationDialog` would cover the confirmation, but the backend requires
 * a non-empty reason on every rejection and that primitive takes no input, so
 * this follows `AdminPlanDialog`'s pattern instead: focus moved in on mount,
 * `Tab` trapped between the dialog's own controls, `Escape` closing except
 * while a request is in flight, and focus handed back on close.
 */
export function RatingRejectionDialog({
  title,
  subtitle,
  placeholder,
  note,
  saving,
  error,
  onClose,
  onConfirm,
}: RatingRejectionDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const onCloseRef = useRef(onClose);
  const savingRef = useRef(saving);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
    savingRef.current = saving;
  }, [onClose, saving]);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    reasonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !savingRef.current) {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), textarea:not([disabled])",
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError("Ingresá el motivo del rechazo.");
      return;
    }
    setValidationError(null);
    await onConfirm(trimmed);
  }

  return (
    <div className={shared.dialogOverlay}>
      <div
        ref={dialogRef}
        className={shared.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={shared.dialogHeader}>
          <div>
            <h2 id={titleId} className="sp-h4">
              {title}
            </h2>
            <p className="sp-small">{subtitle}</p>
          </div>
          <button
            type="button"
            className={shared.iconButton}
            aria-label="Cerrar formulario"
            disabled={saving}
            onClick={onClose}
          >
            <Icon name="x" size={18} />
          </button>
        </header>
        <form className={shared.form} onSubmit={(event) => void submit(event)}>
          <label className={shared.field}>
            Motivo del rechazo <span className={styles.charCount}>({reason.length}/{MAX_REASON_LENGTH})</span>
            <textarea
              ref={reasonRef}
              value={reason}
              maxLength={MAX_REASON_LENGTH}
              placeholder={placeholder}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <p className="sp-small">{note}</p>
          {validationError ?? error ? (
            <p className={shared.formError} role="alert">
              {validationError ?? error}
            </p>
          ) : null}
          <div className={shared.dialogActions}>
            <Button variant="ghostLight" disabled={saving} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={saving}>
              {saving ? "Rechazando..." : "Rechazar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
