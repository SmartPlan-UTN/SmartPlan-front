"use client";

import { useEffect, useRef, useState } from "react";

import { Chip, Icon } from "@/components/ui";
import type { PlanRequestContext, TimeOfDay } from "@/types";

import styles from "./ContextChips.module.css";

export interface ContextChipsProps {
  value: PlanRequestContext;
  onChange: (value: PlanRequestContext) => void;
}

const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: "morning", label: "Mañana" },
  { value: "afternoon", label: "Tarde" },
  { value: "evening", label: "Noche" },
  { value: "night", label: "Madrugada" },
];

/**
 * Budget / time-of-day / party-size context chips (CU17). Every field is
 * genuinely optional and starts unset — a chip only enters `context` once
 * the user has actually set a value through it, never pre-filled with a
 * placeholder default. No location chip: `idDepartment` has no picker built
 * anywhere in the app yet, so it's left out of scope for this pass.
 */
export function ContextChips({ value, onChange }: ContextChipsProps) {
  const [openChip, setOpenChip] = useState<"budget" | "timeOfDay" | "partySize" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openChip) return;

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenChip(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenChip(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openChip]);

  const timeOfDayLabel = value.timeOfDay
    ? TIME_OF_DAY_OPTIONS.find((option) => option.value === value.timeOfDay)?.label
    : null;

  return (
    <div className={styles.row} ref={containerRef}>
      <div className={styles.chipWrapper}>
        <Chip
          className={styles.chipCompact}
          active={value.timeOfDay != null}
          aria-expanded={openChip === "timeOfDay"}
          onClick={() => {
            setOpenChip((current) => (current === "timeOfDay" ? null : "timeOfDay"));
          }}
        >
          <Icon name="clock" size={13} aria-hidden="true" />
          {timeOfDayLabel ?? "Momento"}
        </Chip>
        {openChip === "timeOfDay" ? (
          <div className={styles.popover} role="listbox" aria-label="Momento del día">
            {TIME_OF_DAY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value.timeOfDay === option.value}
                className={styles.popoverOption}
                onClick={() => {
                  onChange({
                    ...value,
                    timeOfDay: value.timeOfDay === option.value ? undefined : option.value,
                  });
                  setOpenChip(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.chipWrapper}>
        <Chip
          className={styles.chipCompact}
          active={value.partySize != null}
          aria-expanded={openChip === "partySize"}
          onClick={() => {
            setOpenChip((current) => (current === "partySize" ? null : "partySize"));
          }}
        >
          <Icon name="users" size={13} aria-hidden="true" />
          {value.partySize != null ? `${value.partySize} personas` : "Personas"}
        </Chip>
        {openChip === "partySize" ? (
          <div className={styles.popover}>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.stepperButton}
                aria-label="Restar una persona"
                disabled={!value.partySize || value.partySize <= 1}
                onClick={() => {
                  const next = Math.max(1, (value.partySize ?? 2) - 1);
                  onChange({ ...value, partySize: next });
                }}
              >
                −
              </button>
              <span className={styles.stepperValue}>{value.partySize ?? 1}</span>
              <button
                type="button"
                className={styles.stepperButton}
                aria-label="Sumar una persona"
                onClick={() => {
                  const next = (value.partySize ?? 1) + 1;
                  onChange({ ...value, partySize: next });
                }}
              >
                +
              </button>
            </div>
            {value.partySize != null ? (
              <button
                type="button"
                className={styles.popoverClear}
                onClick={() => {
                  onChange({ ...value, partySize: undefined });
                  setOpenChip(null);
                }}
              >
                Quitar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.chipWrapper}>
        <Chip
          className={styles.chipCompact}
          active={value.budget != null}
          aria-expanded={openChip === "budget"}
          onClick={() => {
            setOpenChip((current) => (current === "budget" ? null : "budget"));
          }}
        >
          <Icon name="wallet" size={13} aria-hidden="true" />
          {value.budget != null ? `$${value.budget.toLocaleString("es-AR")}` : "Presupuesto"}
        </Chip>
        {openChip === "budget" ? (
          <div className={styles.popover}>
            <label className={styles.popoverLabel} htmlFor="context-budget">
              Presupuesto estimado
            </label>
            <input
              id="context-budget"
              type="number"
              min={0}
              step={500}
              className={styles.popoverInput}
              value={value.budget ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                onChange({
                  ...value,
                  budget: raw === "" ? undefined : Math.max(0, Number(raw)),
                });
              }}
              placeholder="$5.000"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
