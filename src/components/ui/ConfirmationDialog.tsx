"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "./Button";
import { Icon } from "./Icon";

import styles from "./confirmation-dialog.module.css";

export interface ConfirmationDialogProps {
  title: string;
  children: ReactNode;
  cancelLabel?: string;
  /**
   * Drops the cancel action for a dialog that only acknowledges (an
   * "under construction" notice, say). Passing `cancelLabel=""` instead
   * still renders the button, so focus lands on a control with no
   * accessible name.
   */
  hideCancel?: boolean;
  confirmLabel: string;
  confirmingLabel?: string;
  isConfirming?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Modal confirmation for a destructive or lossy action (CU26, CU33, CU34,
 * and the discard-changes prompts in CU24/CU25).
 *
 * `role="alertdialog"` plus `aria-modal` announces it, but neither stops
 * `Tab` from walking out into the page behind, so focus is moved to the
 * cancel button on mount, trapped between the two actions, and handed back
 * to whatever was focused before on close. `Escape` cancels, except
 * mid-confirmation, when there's a request in flight the user can no
 * longer call off. With `hideCancel`, the confirm button is the only stop
 * on the ring and takes the initial focus.
 */
export function ConfirmationDialog({
  title,
  children,
  cancelLabel = "Cancelar",
  hideCancel = false,
  confirmLabel,
  confirmingLabel = "Procesando...",
  isConfirming = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // `useId` instead of fixed ids: two dialogs can be mounted at once (a
  // page-level one and a form-level one), and duplicate ids would point
  // both `aria-labelledby`s at the same node.
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    (hideCancel ? confirmRef : cancelRef).current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [hideCancel]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isConfirming) {
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      if (hideCancel) {
        // A single stop on the ring: Tab has nowhere to go but back to it.
        event.preventDefault();
        confirmRef.current?.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === cancelRef.current) {
        event.preventDefault();
        confirmRef.current?.focus();
      } else if (!event.shiftKey && document.activeElement === confirmRef.current) {
        event.preventDefault();
        cancelRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hideCancel, isConfirming, onCancel]);

  // Portaled to `document.body`, not rendered in place: `Screen`'s entrance
  // animation leaves a `transform` on itself via `animation-fill-mode:
  // both` (see `layout.module.css` `.screen`), and a `transform` on any
  // ancestor turns it into the containing block for `position: fixed`
  // descendants — the overlay would size and center itself against
  // `Screen`'s box instead of the viewport. A portal sidesteps that
  // regardless of which page mounts this dialog.
  return createPortal(
    <div className={styles.overlay}>
      <section
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <span className={styles.warningIcon} aria-hidden="true">
          <Icon name="triangle-alert" size={24} />
        </span>
        <h2 id={titleId} className="sp-h4">
          {title}
        </h2>
        <div id={descriptionId} className={`sp-body ${styles.dialogCopy}`}>
          {children}
        </div>
        {error ? (
          <p className={styles.dialogError} role="alert">
            <Icon name="triangle-alert" size={18} />
            {error}
          </p>
        ) : null}
        <div className={styles.dialogActions}>
          {hideCancel ? null : (
            <Button
              ref={cancelRef}
              variant="ghostLight"
              onClick={onCancel}
              disabled={isConfirming}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            ref={confirmRef}
            variant="danger"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? confirmingLabel : confirmLabel}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
