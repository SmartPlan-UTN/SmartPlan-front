"use client";

import { useEffect } from "react";

import { Icon, type IconName } from "./Icon";

import styles from "./toast.module.css";

export interface ToastNotice {
  /** Changes with every notice so the timer restarts for a new one. */
  id: number;
  message: string;
  action?: { label: string; icon?: IconName; onClick: () => void };
}

export interface ToastProps {
  notice: ToastNotice | null;
  onDismiss: () => void;
  /** Placement overrides for a screen with its own floating bars. */
  className?: string;
}

const VISIBLE_MS = 7000;

/** A short confirmation at the bottom of the screen, gone on its own. */
export function Toast({ notice, onDismiss, className }: ToastProps) {
  const noticeId = notice?.id;

  useEffect(() => {
    if (noticeId === undefined) return;
    const timer = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [noticeId, onDismiss]);

  if (!notice) return null;

  return (
    <div
      className={className ? `${styles.toast} ${className}` : styles.toast}
      role="status"
      aria-live="polite"
    >
      <span className={styles.message}>{notice.message}</span>
      {notice.action ? (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            notice.action?.onClick();
            onDismiss();
          }}
        >
          {notice.action.icon ? (
            <Icon name={notice.action.icon} size={15} aria-hidden="true" />
          ) : null}
          {notice.action.label}
        </button>
      ) : null}
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
