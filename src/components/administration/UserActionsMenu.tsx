"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/ui";
import type { AdminUser, UserStatusKey } from "@/types";

import styles from "./administration.module.css";

export interface UserActionsMenuProps {
  user: AdminUser;
  onSelect: (user: AdminUser, status: UserStatusKey) => void;
}

export function UserActionsMenu({ user, onSelect }: UserActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function closeMenu() {
      setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [open]);

  function select(status: UserStatusKey) {
    setOpen(false);
    onSelect(user, status);
  }

  return (
    <div className={styles.actionsMenu}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.actionsTrigger} ${open ? styles.actionsTriggerOpen : ""}`}
        aria-label={`Acciones para ${user.name} ${user.lastName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
          }
          setOpen((current) => !current);
        }}
      >
        <span aria-hidden="true">•••</span>
      </button>

      {open ? createPortal(
        <div
          ref={popoverRef}
          className={styles.actionsPopover}
          role="menu"
          style={{ top: position.top, right: position.right }}
        >
          {user.status.key !== "active" ? (
            <button type="button" role="menuitem" onClick={() => select("active")}>
              <Icon name="circle-check" size={16} />
              Reactivar cuenta
            </button>
          ) : (
            <button type="button" role="menuitem" onClick={() => select("suspended")}>
              <Icon name="lock" size={16} />
              Suspender cuenta
            </button>
          )}
          {user.status.key !== "banned" ? (
            <button
              type="button"
              role="menuitem"
              className={styles.dangerAction}
              onClick={() => select("banned")}
            >
              <Icon name="ban" size={16} />
              Banear cuenta
            </button>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
