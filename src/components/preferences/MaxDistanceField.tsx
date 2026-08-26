"use client";

import styles from "./preferences.module.css";

const MIN_KM = 1;
const MAX_KM = 50;
const DEFAULT_KM = 20;
const QUICK_VALUES = [5, 10, 20, 30, 50] as const;

interface MaxDistanceFieldProps {
  /** `null` means "no maximum distance". */
  value: number | null;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}

/**
 * PAN 15 "distancia máxima": a 1–50 km slider with quick presets. Optional —
 * it can be cleared to "sin límite" and set again.
 */
export function MaxDistanceField({
  value,
  disabled = false,
  onChange,
}: MaxDistanceFieldProps) {
  const sliderValue = value ?? DEFAULT_KM;

  if (value === null) {
    return (
      <div className={styles.distanceField}>
        <p className={styles.distanceEmpty}>
          <strong>Sin límite de distancia.</strong> Te mostramos planes sin
          importar qué tan lejos estén.
        </p>
        <button
          type="button"
          className={styles.inlineAction}
          onClick={() => onChange(DEFAULT_KM)}
          disabled={disabled}
        >
          Definir una distancia máxima
        </button>
      </div>
    );
  }

  return (
    <div className={styles.distanceField}>
      <div className={styles.distanceReadout} aria-hidden="true">
        <span className={styles.distanceValue}>{value}</span>
        <span className={styles.distanceUnit}>km</span>
      </div>

      <input
        type="range"
        className={styles.distanceSlider}
        min={MIN_KM}
        max={MAX_KM}
        step={1}
        value={sliderValue}
        disabled={disabled}
        aria-label="Distancia máxima en kilómetros"
        aria-valuetext={`${value} kilómetros`}
        onChange={(event) => onChange(Number(event.target.value))}
      />

      <div className={styles.distancePresets}>
        {QUICK_VALUES.map((preset) => (
          <button
            key={preset}
            type="button"
            className={
              value === preset
                ? `${styles.distancePreset} ${styles.distancePresetActive}`
                : styles.distancePreset
            }
            aria-pressed={value === preset}
            disabled={disabled}
            onClick={() => onChange(preset)}
          >
            {preset} km
          </button>
        ))}
        <button
          type="button"
          className={styles.inlineClear}
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          Quitar límite
        </button>
      </div>
    </div>
  );
}
