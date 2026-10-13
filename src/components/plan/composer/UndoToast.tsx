"use client";

import { Toast } from "@/components/ui";

import styles from "./UndoToast.module.css";

export interface UndoNotice {
  /** Changes with every notice so the timer restarts for a new one. */
  id: number;
  message: string;
  onUndo: () => void;
}

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
  return (
    <Toast
      className={styles.placement}
      onDismiss={onDismiss}
      notice={
        notice && {
          id: notice.id,
          message: notice.message,
          action: { label: "Deshacer", icon: "undo-2", onClick: notice.onUndo },
        }
      }
    />
  );
}
