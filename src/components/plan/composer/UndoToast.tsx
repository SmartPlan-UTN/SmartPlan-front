"use client";

import { useEffect } from "react";

import { Icon } from "@/components/ui";

import styles from "./UndoToast.module.css";

export interface UndoNotice {
  /** Changes with every notice so the timer restarts for a new one. */
  id: number;
  message: string;
  onUndo: () => void;
}

const VISIBLE_MS = 7000;

/**
 * Confirms a change the person just made and offers to take it back. It is
 * how removing a stop (or accepting a proposed order) stays safe without a
 * confirmation dialog in the way.
 */
export function UndoToast({
  notice,
  onDismiss,
}: {
  notice: UndoNotice | null;
  onDismiss: () => void;
}) {
  const noticeId = notice?.id;

  useEffect(() => {
    if (noticeId === undefined) return;
    const timer = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [noticeId, onDismiss]);

  if (!notice) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.message}>{notice.message}</span>
      <button
        type="button"
        className={styles.undo}
        onClick={() => {
          notice.onUndo();
          onDismiss();
        }}
      >
        <Icon name="undo-2" size={15} aria-hidden="true" />
        Deshacer
      </button>
      <button
        type="button"
        className={styles.close}
        aria-label="Cerrar aviso"
        onClick={onDismiss}
      >
        <Icon name="x" size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
