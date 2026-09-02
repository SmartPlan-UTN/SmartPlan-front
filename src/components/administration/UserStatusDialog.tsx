"use client";

import { useEffect, useRef } from "react";

import { Button, Icon } from "@/components/ui";
import type { AdminUser, UserStatusKey } from "@/types";

import styles from "./administration.module.css";

const COPY: Record<UserStatusKey, { title: string; confirm: string; progress: string }> = {
  active: {
    title: "Reactivar cuenta",
    confirm: "Reactivar",
    progress: "Reactivando...",
  },
  suspended: {
    title: "Suspender cuenta",
    confirm: "Suspender",
    progress: "Suspendiendo...",
  },
  banned: {
    title: "Banear cuenta",
    confirm: "Banear",
    progress: "Baneando...",
  },
};

export interface UserStatusDialogProps {
  user: AdminUser;
  status: UserStatusKey;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function UserStatusDialog({
  user,
  status,
  saving,
  error,
  onCancel,
  onConfirm,
}: UserStatusDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const copy = COPY[status];

  useEffect(() => {
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
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
  }, [onCancel, saving]);

  return (
    <div className={styles.dialogOverlay}>
      <section
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="user-status-title"
        aria-describedby="user-status-description"
      >
        <span className={styles.dialogIcon} aria-hidden="true">
          <Icon name={status === "active" ? "circle-check" : "triangle-alert"} size={24} />
        </span>
        <h2 id="user-status-title" className="sp-h4">
          {copy.title}
        </h2>
        <p id="user-status-description" className="sp-body">
          {status === "active"
            ? `La cuenta de ${user.name} ${user.lastName} volverá a poder iniciar sesión.`
            : `La cuenta de ${user.name} ${user.lastName} perderá todas sus sesiones activas.`}
        </p>
        {error ? <p className={styles.dialogError} role="alert">{error}</p> : null}
        <div className={styles.dialogActions}>
          <Button ref={cancelRef} variant="ghostLight" disabled={saving} onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            ref={confirmRef}
            variant={status === "active" ? "primary" : "danger"}
            disabled={saving}
            onClick={onConfirm}
          >
            {saving ? copy.progress : copy.confirm}
          </Button>
        </div>
      </section>
    </div>
  );
}
