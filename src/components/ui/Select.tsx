"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "./Icon";

import styles from "./Select.module.css";

export interface SelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

export interface SelectProps<TValue extends string> {
  value: TValue;
  onChange: (value: TValue) => void;
  options: SelectOption<TValue>[];
  "aria-label"?: string;
}

/**
 * A dropdown styled entirely by this app's own CSS, not a native `<select>`.
 * The trigger can be restyled freely, but the open option list of a real
 * `<select>` is painted by the OS/browser — `border-radius` and colors on it
 * are ignored on Windows Chrome/Edge, which is exactly the "square dropdown
 * over a rounded field" look this replaces (CU10/CU11 filters).
 */
export function Select<TValue extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
}: SelectProps<TValue>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <span className={styles.triggerLabel}>{current?.label ?? ""}</span>
        <Icon
          name="chevron-down"
          size={16}
          aria-hidden="true"
          className={`${styles.triggerIcon} ${open ? styles.triggerIconOpen : ""}`}
        />
      </button>

      {open ? (
        <ul className={styles.listbox} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`${styles.option} ${option.value === value ? styles.optionActive : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
