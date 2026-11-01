"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui";
import { useScrollLock } from "@/hooks";

import styles from "./AdminManagement.module.css";

export interface AdminReadField {
  label: string;
  value: ReactNode;
  /** Spans both grid columns, for long values such as a description. */
  wide?: boolean;
}

export interface AdminReadDialogProps {
  icon: IconName;
  eyebrow: string;
  title: string;
  subtitle?: string;
  fields: AdminReadField[];
  /** Buttons for the record's actions (edit, delete, images...). */
  actions?: ReactNode;
  /** Extra content under the fields, such as an image gallery. */
  children?: ReactNode;
  onClose: () => void;
}

/**
 * Read-only view of a catalog record, opened by clicking its table row in
 * Actividades, Planes and Lugares, as the users table does. Shared so the
 * three screens present a record the same way.
 */
export function AdminReadDialog({
  icon,
  eyebrow,
  title,
  subtitle,
  fields,
  actions,
  children,
  onClose,
}: AdminReadDialogProps) {
  useScrollLock();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div
      className={styles.dialogOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.dialogHeader}>
          <div className={styles.readIdentity}>
            <span className={styles.readIcon} aria-hidden="true">
              <Icon name={icon} size={20} />
            </span>
            <div>
              <p className={styles.readEyebrow}>{eyebrow}</p>
              <h2 id={titleId} className="sp-h4">{title}</h2>
              {subtitle ? <p className="sp-small">{subtitle}</p> : null}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.iconButton}
            aria-label="Cerrar"
            onClick={onClose}
          >
            <Icon name="x" size={18} />
          </button>
        </header>

        <dl className={styles.readGrid}>
          {fields.map((field) => (
            <div
              key={field.label}
              className={field.wide ? styles.readWide : undefined}
            >
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>

        {children}

        {actions ? <div className={styles.readActions}>{actions}</div> : null}
      </div>
    </div>
  );
}
