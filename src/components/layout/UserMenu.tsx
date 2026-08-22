"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { NavLink } from "./NavLink";
import { USER_LINKS } from "./links";
import styles from "./layout.module.css";

/**
 * Navbar user menu.
 *
 * Three states, one per session status:
 *
 * - `loading`: a same-sized placeholder, so the navbar doesn't jump once
 *   the token resolves.
 * - `anonymous`: link to log in.
 * - `authenticated`: dropdown with Mi perfil, Preferencias, and Cerrar sesión.
 *
 * It's a *disclosure* pattern, not an ARIA `menu`: the dropdown is regular
 * links navigated with Tab. It closes on Escape —returning focus to the
 * trigger—, on outside click, and on navigation.
 */
export function UserMenu() {
  const { status, logout } = useSession();
  const currentRoute = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

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
        // The label is hidden on small viewports and the icons are
        // decorative: without this aria-label the button would have no name.
        aria-label="Mi cuenta"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((isOpen) => !isOpen);
        }}
      >
        <Icon name="user" size={16} />
        <span className={styles.labelSession} aria-hidden="true">
          Mi cuenta
        </span>
        <Icon name="chevron-down" size={14} />
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
              logout();
            }}
          >
            <Icon name="log-out" size={16} />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
