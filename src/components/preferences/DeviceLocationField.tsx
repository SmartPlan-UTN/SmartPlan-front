"use client";

import { Icon } from "@/components/ui";

import styles from "./preferences.module.css";
import { useGeolocationPermission } from "./useGeolocationPermission";

interface DeviceLocationFieldProps {
  value: boolean;
  saved?: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

const PERMISSION_COPY: Record<string, string> = {
  granted: "La ubicación está habilitada. La obtendremos al generar cada plan.",
  prompt:
    "Te pediremos permiso para acceder a tu ubicación la próxima vez que generes un plan.",
  denied:
    "Bloqueaste el acceso a la ubicación en este navegador. Habilitalo en los ajustes del sitio para que funcione.",
  unsupported:
    "Este navegador no permite compartir la ubicación del dispositivo.",
  unknown:
    "Te pediremos permiso para acceder a tu ubicación cuando haga falta.",
};

/**
 * PAN 15 toggle "Usar ubicación del dispositivo". Stores the *preference*
 * "prefer my current location when it's available" — turning it on never
 * assumes the browser will grant permission, so the copy underneath reflects
 * the real permission state and offers an explicit probe.
 */
export function DeviceLocationField({
  value,
  saved = value,
  disabled = false,
  onChange,
}: DeviceLocationFieldProps) {
  const { permission, probing, probe } = useGeolocationPermission(value);
  const showProbe =
    value && (permission === "prompt" || permission === "unknown");

  return (
    <div className={styles.toggleField}>
      <label className={styles.toggleRow}>
        <span className={styles.toggleText}>
          <span className={styles.toggleTitle}>
            <Icon name="locate-fixed" size={18} />
            Usar la ubicación de mi dispositivo
          </span>
          <span className={styles.toggleHint}>
            Al generar un plan, usamos el GPS como centro de búsqueda. No necesitás
            definir una zona preferida; si el GPS no está disponible, usamos esa zona si la guardaste.
            Este cambio se aplica al guardar las preferencias.
          </span>
        </span>

        <span
          className={
            value ? `${styles.switch} ${styles.switchOn}` : styles.switch
          }
        >
          <input
            type="checkbox"
            className={styles.switchInput}
            checked={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className={styles.switchTrack} aria-hidden="true">
            <span className={styles.switchThumb} />
          </span>
        </span>
      </label>

      {value ? (
        <p
          className={
            permission === "denied" || permission === "unsupported"
              ? styles.toggleStatusWarn
              : styles.toggleStatus
          }
          role="status"
        >
          <Icon
            name={
              permission === "granted"
                ? "circle-check"
                : permission === "denied" || permission === "unsupported"
                  ? "triangle-alert"
                  : "info"
            }
            size={15}
          />
          {permission === "granted" && !saved
            ? "El navegador permite usar tu ubicación. Guardá las preferencias para aplicar este cambio."
            : PERMISSION_COPY[permission] ?? PERMISSION_COPY.unknown}
          {showProbe ? (
            <button
              type="button"
              className={styles.inlineAction}
              onClick={() => {
                void probe();
              }}
              disabled={disabled || probing}
            >
              {probing ? "Pidiendo permiso…" : "Probar ahora"}
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
