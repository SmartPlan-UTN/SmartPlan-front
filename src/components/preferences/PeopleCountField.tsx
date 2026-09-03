"use client";

import { Icon } from "@/components/ui";

import styles from "./preferences.module.css";

const MIN_PEOPLE = 1;
const MAX_PEOPLE = 20;
const DEFAULT_ON_ADD = 2;

interface PeopleCountFieldProps {
  /** `null` means "no usual party size set". */
  value: number | null;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}

/**
 * PAN 15 "cantidad habitual de personas": a +/- stepper with a typable
 * number field in the middle. Optional — the field starts empty and can be
 * cleared back to empty; when it has a value it is clamped to 1..20 and
 * never sends 0.
 */
export function PeopleCountField({
  value,
  disabled = false,
  onChange,
}: PeopleCountFieldProps) {
  const set = value ?? 0;
  const canDecrement = value !== null && value > MIN_PEOPLE;
  const canIncrement = value === null || value < MAX_PEOPLE;

  return (
    <div className={styles.stepperField}>
      <div
        className={styles.stepper}
        role="group"
        aria-label="Cantidad habitual de personas"
      >
        <button
          type="button"
          className={styles.stepperButton}
          onClick={() => onChange(canDecrement ? set - 1 : null)}
          disabled={disabled || value === null}
          aria-label={
            value !== null && value <= MIN_PEOPLE
              ? "Quitar la cantidad de personas"
              : "Restar una persona"
          }
        >
          <Icon name="minus" size={18} stroke={2.4} />
        </button>

        <span className={styles.stepperValue}>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_PEOPLE}
            max={MAX_PEOPLE}
            className={
              value === null
                ? `${styles.stepperInput} ${styles.stepperInputEmpty}`
                : styles.stepperInput
            }
            value={value ?? ""}
            disabled={disabled}
            placeholder="Sin definir"
            aria-label="Cantidad de personas"
            onChange={(event) => {
              const raw = event.target.value;
              if (raw.trim() === "") {
                onChange(null);
                return;
              }
              const parsed = Number(raw);
              if (!Number.isFinite(parsed)) return;
              onChange(
                Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, Math.round(parsed))),
              );
            }}
          />
          {value !== null ? (
            <span aria-live="polite">
              {value === 1 ? "persona" : "personas"}
            </span>
          ) : null}
        </span>

        <button
          type="button"
          className={styles.stepperButton}
          onClick={() =>
            onChange(
              value === null ? DEFAULT_ON_ADD : Math.min(MAX_PEOPLE, set + 1),
            )
          }
          disabled={disabled || !canIncrement}
          aria-label={
            value === null
              ? "Definir la cantidad de personas"
              : "Sumar una persona"
          }
        >
          <Icon name="plus" size={18} stroke={2.4} />
        </button>
      </div>

      {value !== null ? (
        <button
          type="button"
          className={styles.inlineClear}
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          Quitar
        </button>
      ) : null}
    </div>
  );
}
