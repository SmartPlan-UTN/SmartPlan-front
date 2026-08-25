"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button, Icon } from "@/components/ui";

import styles from "./collection.module.css";

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
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
      >
        <span className={styles.warningIcon} aria-hidden="true">
          <Icon name="triangle-alert" size={24} />
        </span>
        <h2 id="confirmation-title" className="sp-h4">
          {title}
        </h2>
        <div id="confirmation-description" className={`sp-body ${styles.dialogCopy}`}>
          {children}
        </div>
        {error ? (
          <p className={styles.formError} role="alert">
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
