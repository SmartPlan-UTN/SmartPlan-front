"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Icon } from "@/components/ui";

import styles from "./StopMenu.module.css";

const ITEMS = '[role="menuitem"]:not(:disabled)';

interface StopMenuProps {
  name: string;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

/**
 * The accessible alternative to dragging, and the way to remove a stop:
 * Subir, Bajar, Quitar. One quiet button per row instead of three icons.
 */
export function StopMenu({
  name,
  index,
  count,
  disabled,
  onMove,
  onRemove,
}: StopMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLButtonElement>(ITEMS)?.focus();

    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [
      ...(rootRef.current?.querySelectorAll<HTMLButtonElement>(ITEMS) ?? []),
    ];
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(current + step + items.length) % items.length].focus();
  }

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={rootRef} className={styles.menuRoot} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.menuTrigger}
        data-menu-trigger=""
        aria-label={`Opciones de ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="ellipsis" size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Opciones de ${name}`}
          className={styles.menu}
        >
          <button
            type="button"
            role="menuitem"
            disabled={index === 0}
            onClick={() => choose(() => onMove(-1))}
          >
            <Icon name="arrow-up" size={15} aria-hidden="true" />
            Subir
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={index === count - 1}
            onClick={() => choose(() => onMove(1))}
          >
            <Icon name="arrow-down" size={15} aria-hidden="true" />
            Bajar
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.menuDanger}
            onClick={() => choose(onRemove)}
          >
            <Icon name="trash-2" size={15} aria-hidden="true" />
            Quitar del recorrido
          </button>
        </div>
      ) : null}
    </div>
  );
}
