"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button, Icon } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { loginRoute, ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { NavLink } from "./NavLink";
import { USER_LINKS } from "./links";
import styles from "./layout.module.css";

interface LogoutConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for "Cerrar sesión", matching the `LogoutModal` in
 * SmartPlanSystemDesign/v2/Navbar.jsx: closing the session is destructive
 * enough to warrant a deliberate second step instead of firing on the first
 * click.
 */
function LogoutConfirmModal({ onCancel, onConfirm }: LogoutConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
        return;
      }

      // Focus trap: `aria-modal` alone doesn't stop Tab from reaching the
      // page behind the overlay — it's an accessibility hint, not a
      // behavior. Wrap Tab/Shift+Tab between this dialog's own two buttons
      // instead of letting focus escape it.
      if (event.key !== "Tab" || !cardRef.current) return;

      const focusable = cardRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  // Portaled to `document.body`, not rendered in place: this dialog's
  // trigger lives inside `Navbar`'s `<header>`, which sets `backdrop-filter`
  // for its own sticky-blur effect. `backdrop-filter` (like `transform` and
  // `filter`) establishes a containing block for `position: fixed`
  // descendants, so without the portal `.modalOverlay` would be confined to
  // the header's box instead of covering the viewport — a small, cut-off
  // card pinned near the top instead of the centered, fully-dimmed overlay
  // the prototype shows.
  return createPortal(
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div
        ref={cardRef}
        className={styles.modalCard}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className={styles.modalIcon}>
          <Icon name="log-out" size={24} />
        </div>

        <div>
          <h2 id={titleId} className={`sp-h3 ${styles.modalTitle}`}>
            Cerrar sesión
          </h2>
          <p id={descriptionId} className={styles.modalText}>
            ¿Seguro que querés cerrar sesión?
          </p>
        </div>

        <div className={styles.modalActions}>
          <Button variant="ghostLight" ref={cancelRef} onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Navbar user menu.
 *
 * Three states, one per session status:
 *
 * - `loading`: a same-sized placeholder, so the navbar doesn't jump once
 *   the token resolves.
 * - `anonymous`: link to log in.
 * - `authenticated`: dropdown with Mi perfil, Preferencias, and Cerrar sesión.
 *   The trigger is a circular avatar, not a text pill — there's no user
 *   name or photo yet, so it shows the `user` icon.
 *
 * It's a *disclosure* pattern, not an ARIA `menu`: the dropdown is regular
 * links navigated with Tab. It closes on Escape —returning focus to the
 * trigger—, on outside click, and on navigation.
 *
 * "Cerrar sesión" doesn't log out on the first click: it opens a
 * confirmation dialog first, same as the SmartPlanSystemDesign prototype.
 * Confirming closes the session (CU4: `DELETE /sessions`, best-effort — see
 * `SessionProvider.logout`) and replaces the current entry with `/login`.
 */
export function UserMenu() {
  const { status, logout } = useSession();
  const currentRoute = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const confirmLogout = useCallback(async () => {
    setConfirmingLogout(false);
    await logout();
    // `replace`, not `push`: same reasoning as `ProtectedRoute`'s redirect
    // and the post-login navigation in `LoginForm`/`RegisterForm` — "back"
    // shouldn't return to a page that required the session just closed.
    router.replace(ROUTES.login);
  }, [logout, router]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onClickOutside = (event: MouseEvent) => {
      const container = containerRef.current;

      if (container && !container.contains(event.target as Node)) {
        close();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  if (status === "loading") {
    return (
      <span
        className={cn(styles.sessionPlaceholder, styles.sessionControl)}
        aria-hidden="true"
      />
    );
  }

  if (status === "anonymous") {
    // Preserve the current screen, same as the guard does: someone entering
    // login from Explorar expects to return to Explorar, not to home.
    return (
      <Link
        href={loginRoute(currentRoute)}
        className={cn(styles.buttonLink, styles.sessionControl)}
        // The label is hidden on small viewports, same as on the trigger.
        aria-label="Iniciar sesión"
      >
        <Icon name="log-in" size={16} />
        <span className={styles.labelSession} aria-hidden="true">
          Iniciar sesión
        </span>
      </Link>
    );
  }

  return (
    <div
      className={cn(styles.userMenu, styles.sessionControl)}
      ref={containerRef}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        // Icon-only: without this aria-label the button would have no name.
        aria-label="Mi cuenta"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((isOpen) => !isOpen);
        }}
      >
        <Icon name="user" size={16} />
      </button>

      {open ? (
        <div className={styles.panel} id={panelId}>
          {USER_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              variant="option"
              onNavigate={close}
            />
          ))}

          <hr className={styles.divider} />

          <button
            type="button"
            className={styles.option}
            onClick={() => {
              close();
              setConfirmingLogout(true);
            }}
          >
            <Icon name="log-out" size={16} />
            Cerrar sesión
          </button>
        </div>
      ) : null}

      {confirmingLogout ? (
        <LogoutConfirmModal
          onCancel={() => {
            setConfirmingLogout(false);
            // The "Cerrar sesión" option that opened this dialog already
            // unmounted with the dropdown, so there's nothing there to
            // return focus to — the avatar trigger is the next best thing.
            triggerRef.current?.focus();
          }}
          onConfirm={() => {
            void confirmLogout();
          }}
        />
      ) : null}
    </div>
  );
}
