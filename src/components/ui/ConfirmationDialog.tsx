"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "./Button";
import { Icon } from "./Icon";

import styles from "./confirmation-dialog.module.css";

export interface ConfirmationDialogProps {
  title: string;
  children: ReactNode;
  cancelLabel?: string;
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
 * cancel button on mount and trapped between the two actions. `Escape`
 * cancels, except mid-confirmation, when there's a request in flight the
 * user can no longer call off.
 */
export function ConfirmationDialog({
  title,
  children,
  cancelLabel = "Cancelar",
  confirmLabel,
  confirmingLabel = "Procesando...",
  isConfirming = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // `useId` instead of fixed ids: two dialogs can be mounted at once (a
  // page-level one and a form-level one), and duplicate ids would point
  // both `aria-labelledby`s at the same node.
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isConfirming) {
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

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
  }, [isConfirming, onCancel]);

  return (
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
          <Button
            ref={cancelRef}
            variant="ghostLight"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
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
    </div>
  );
}
