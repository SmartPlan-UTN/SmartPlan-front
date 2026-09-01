import { useId, type ChangeEvent } from "react";

import { Icon, type IconName } from "./Icon";
import styles from "./Field.module.css";

export interface FieldRightSlot {
  icon: IconName;
  label: string;
  pressed?: boolean;
  onClick: () => void;
}

export interface FieldProps {
  label: string;
  type: string;
  value: string;
  /** Optional: omit for a read-only field (e.g. an email shown but not
   * editable) instead of passing a no-op handler. */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  rightSlot?: FieldRightSlot;
}

/**
 * Label + input + inline error. Ported from the v2 system design's
 * `AuthField` (`Login.jsx`) / `ProfileField` (`Profile.jsx`) — the same
 * component under two names in the prototype. Originally lived in
 * `components/auth/` for CU1/CU2's forms; promoted here once CU5's profile
 * form needed the same field, so both domains share one implementation
 * instead of two copies drifting apart.
 */
export function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  required,
  disabled,
  autoComplete,
  rightSlot,
}: FieldProps) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={`sp-label ${styles.label}`} htmlFor={inputId}>
          {label}
        </label>
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </div>
      <div className={styles.inputWrapper}>
        <input
          id={inputId}
          type={type}
          autoComplete={autoComplete}
          className={[
            styles.input,
            rightSlot ? styles.inputWithToggle : "",
            error ? styles.inputInvalid : "",
          ]
            .filter(Boolean)
            .join(" ")}
          value={value}
          onChange={onChange}
          readOnly={!onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          placeholder={placeholder}
        />
        {rightSlot ? (
          <button
            type="button"
            className={styles.toggleVisibility}
            onClick={rightSlot.onClick}
            aria-label={rightSlot.label}
            aria-pressed={rightSlot.pressed}
          >
            <Icon name={rightSlot.icon} size={18} />
          </button>
        ) : null}
      </div>
      {/* Always rendered, with the text hidden (not removed) when there's no
          error: reserving the line's height keeps every field — and the
          form around it — the same size whether or not it's showing a
          message, instead of growing/shrinking as errors appear. */}
      <p
        className={
          error ? styles.fieldError : `${styles.fieldError} ${styles.fieldErrorHidden}`
        }
        id={errorId}
        role={error ? "alert" : undefined}
      >
        {error || " "}
      </p>
    </div>
  );
}
