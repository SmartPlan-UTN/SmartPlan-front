"use client";

import { useId, type Ref } from "react";

import styles from "./counted-textarea.module.css";

export interface CountedTextareaProps {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown next to the label, e.g. "(opcional)". */
  hint?: string;
  disabled?: boolean;
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

/** A labelled textarea that shows how many characters are left to use. */
export function CountedTextarea({
  label,
  value,
  maxLength,
  onChange,
  placeholder,
  hint,
  disabled,
  invalid,
  ref,
}: CountedTextareaProps) {
  const id = useId();
  const countId = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        <span>
          {label}
          {hint ? <span className={styles.hint}> {hint}</span> : null}
        </span>
        <span id={countId} className={styles.count}>
          {value.length}/{maxLength}
        </span>
      </label>
      <textarea
        ref={ref}
        id={id}
        className={styles.textarea}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={countId}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
