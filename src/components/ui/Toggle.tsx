import styles from "./Toggle.module.css";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * On/off switch, ported from the v2 system design's `.pref-toggle-track`/
 * `.pref-toggle-thumb` (`Preferences.jsx`'s "Usar ubicación del
 * dispositivo"). A real `<button role="switch">`, not the prototype's
 * `onClick` div, so it's reachable by keyboard and announces its state —
 * the visual (track + sliding thumb) is otherwise identical.
 */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={styles.wrapper}
      onClick={() => {
        onChange(!checked);
      }}
    >
      <span
        className={`${styles.track} ${checked ? styles.trackOn : styles.trackOff}`}
      >
        <span className={styles.thumb} />
      </span>
      {label ? <span className={styles.label}>{label}</span> : null}
    </button>
  );
}
