"use client";

import { useEffect, useState } from "react";

import { getOuting } from "@/lib/api";

import styles from "./feedback.module.css";

export interface CostableActivity {
  id: number;
  name: string;
}

/** Plain-number parser for the optional amounts: "12.500" or "12500,50". */
export function parseCostAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 && value <= 99_999_999.99
    ? Math.round(value * 100) / 100
    : null;
}

function cleanAmount(raw: string): string {
  return raw.replace(/[^\d.,]/g, "").slice(0, 12);
}

interface ActivityCostsFieldProps {
  outingId: number;
  disabled?: boolean;
  /** Raw input text by activity id: the dialog owns the state. */
  values: Record<number, string>;
  onChange: (values: Record<number, string>) => void;
}

/**
 * Optional "how much did each activity cost" step. Explicit, independent
 * observations: nothing here is derived from (or distributed out of) the
 * total the person reports above, and leaving everything empty is normal.
 * Activities load only when the person opens the section.
 */
export function ActivityCostsField({
  outingId,
  disabled = false,
  values,
  onChange,
}: ActivityCostsFieldProps) {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<CostableActivity[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || activities !== null) return;
    let active = true;
    getOuting(outingId)
      .then((outing) => {
        if (!active) return;
        const seen = new Set<number>();
        const list = [...outing.details]
          .sort((a, b) => a.order - b.order)
          .flatMap((detail) => (detail.activity ? [detail.activity] : []))
          .filter((activity) => {
            if (seen.has(activity.id)) return false;
            seen.add(activity.id);
            return true;
          })
          .map((activity) => ({ id: activity.id, name: activity.name }));
        setActivities(list);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [open, activities, outingId]);

  return (
    <div className={styles.field} data-testid="activity-costs-field">
      <button
        type="button"
        className={styles.commentToggle}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        {open ? "Ocultar gasto por actividad" : "Contar cuánto costó cada actividad (opcional)"}
      </button>
      {open ? (
        <div>
          <p className={styles.hint}>
            Sólo las que quieras. Es lo que pagó tu grupo en cada una; no se
            reparte a partir del total.
          </p>
          {failed ? (
            <p className={styles.error} role="alert">
              No pudimos cargar las actividades. Podés enviar el resto igual.
            </p>
          ) : activities === null ? (
            <p className={styles.hint}>Cargando actividades…</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className={styles.moneyRow}>
                <label htmlFor={`feedback-activity-cost-${activity.id}`}>
                  {activity.name}
                </label>
                <div className={styles.moneyInput}>
                  <span aria-hidden="true">$</span>
                  <input
                    id={`feedback-activity-cost-${activity.id}`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="Opcional"
                    value={values[activity.id] ?? ""}
                    disabled={disabled}
                    onChange={(event) => {
                      onChange({
                        ...values,
                        [activity.id]: cleanAmount(event.target.value),
                      });
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
