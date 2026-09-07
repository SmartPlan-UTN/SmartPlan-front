"use client";

import { useEffect, useRef } from "react";

import { Button, Icon } from "@/components/ui";

import styles from "./preferences.module.css";

interface ResetPreferencesDialogProps {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * PAN 15 "Restablecer preferencias" confirmation. A plain focus-managed
 * overlay (not the native `<dialog>`, which jsdom does not implement and
 * whose top-layer behaviour is inconsistent across browsers).
 */
export function ResetPreferencesDialog({
  open,
  busy,
  onCancel,
  onConfirm,
}: ResetPreferencesDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className={styles.dialogOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-text"
      >
        <div className={styles.dialogBody}>
          <span className={styles.dialogIcon} aria-hidden="true">
            <Icon name="triangle-alert" size={22} />
          </span>
          <h2 id="reset-dialog-title" className={styles.dialogTitle}>
            ¿Restablecer todas tus preferencias?
          </h2>
          <p id="reset-dialog-text" className={styles.dialogText}>
            Se van a borrar tus intereses, presupuesto, cantidad de personas,
            zona preferida y distancia máxima. Esta acción no se puede deshacer.
          </p>
          <div className={styles.dialogActions}>
            <Button
              type="button"
              variant="ghostLight"
              onClick={onCancel}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              ref={confirmRef}
              type="button"
              variant="danger"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Icon
                    name="loader-circle"
                    size={17}
                    className={styles.saveSpinner}
                  />
                  Restableciendo…
                </>
              ) : (
                "Sí, restablecer"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
