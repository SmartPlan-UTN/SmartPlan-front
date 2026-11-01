"use client";

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Icon } from "./Icon";

import styles from "./form-dialog.module.css";

const FOCUSABLE =
  "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])";

export interface FormDialogProps {
  title: string;
  /** Whose content and where, under the title. */
  subtitle?: string;
  /** A request is in flight: `Escape` and the close button do nothing. */
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** The fields, then the actions; rendered inside the `<form>`. */
  children: ReactNode;
}

/**
 * A modal holding a small form, for what `ConfirmationDialog` can't ask:
 * a reason to remove reported content, or what is wrong with it (#156).
 *
 * Focus moves to the first field on mount, `Tab` stays between the dialog's
 * own controls, `Escape` closes except while a request is in flight, and
 * focus goes back where it was on close. Portaled to `document.body` for the
 * same reason as `ConfirmationDialog`: a transformed ancestor would trap the
 * fixed overlay.
 */
export function FormDialog({
  title,
  subtitle,
  busy,
  onClose,
  onSubmit,
  children,
}: FormDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fields = dialogRef.current?.querySelectorAll<HTMLElement>(
      "input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
    );
    fields?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
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

  return createPortal(
    <div className={styles.overlay}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.header}>
          <div>
            <h2 id={titleId} className="sp-h4">
              {title}
            </h2>
            {subtitle ? <p className="sp-small">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Cerrar"
            disabled={busy}
            onClick={onClose}
          >
            <Icon name="x" size={18} />
          </button>
        </header>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {children}
        </form>
      </div>
    </div>,
    document.body,
  );
}

/** The cancel and confirm row at the end of a `FormDialog`. */
export function FormDialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

/** A validation or request error inside a `FormDialog`. */
export function FormDialogError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className={styles.error} role="alert">
      {message}
    </p>
  );
}
