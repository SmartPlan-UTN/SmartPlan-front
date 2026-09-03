"use client";

import { Icon } from "@/components/ui";

import { INTENTS } from "./landingContent";
import styles from "./hero.module.css";

export interface IntentChipsProps {
  disabled?: boolean;
  /** Receives the chip's full phrase, not its label. */
  onPick: (query: string) => void;
}

/**
 * The answer to "what am I supposed to write here?".
 *
 * A search field with an animated placeholder tells you the product
 * accepts sentences, but only if you stand still long enough to read two
 * of them. These chips say it at a glance, and then prove it: clicking
 * one does not filter anything and does not submit anything — it writes a
 * whole sentence into the field and leaves the caret at the end, so the
 * next thing a person sees is their own idea, editable, in the box.
 *
 * That is why the chip's label and its query differ. "Cita" as a label is
 * scannable; "Cita" as the inserted text would teach that this is a
 * keyword box, which is the one misunderstanding the landing exists to
 * prevent.
 */
export function IntentChips({ disabled = false, onPick }: IntentChipsProps) {
  return (
    <div className={styles.intents}>
      <span className={styles.intentsLabel}>Probá con</span>

      <ul className={styles.intentList}>
        {INTENTS.map((intent) => (
          <li key={intent.label} className={styles.intentItem}>
            <button
              type="button"
              className={styles.intent}
              disabled={disabled}
              onClick={() => onPick(intent.query)}
            >
              <Icon name={intent.icon} size={14} stroke={1.9} aria-hidden="true" />
              {intent.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
