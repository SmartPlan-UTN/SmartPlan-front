"use client";

import { useEffect, useState } from "react";

import { Button, Icon } from "@/components/ui";
import type { PlanRequestFailure, PlanRequestPhase } from "@/hooks";

import styles from "./generation.module.css";

// Ambient, illustrative copy only — never presented as completed steps.
// The backend has no sub-status inside `processing`; these phrases just
// give the wait some texture while `processing` is the real, honest state.
const PROCESSING_AMBIENT_COPY = [
  "Cruzando actividades compatibles con tu pedido…",
  "Chequeando horarios y disponibilidad…",
  "Armando el orden que más rinde…",
];

export interface GenerationStateProps {
  phase: Extract<PlanRequestPhase, "submitting" | "pending" | "processing" | "timedOut" | "failed">;
  failure: PlanRequestFailure | null;
  onKeepWaiting: () => void;
  /** Issues the same request again. Only offered when there is one to repeat. */
  onRetry: () => void;
  onDiscard: () => void;
  canRetry?: boolean;
}

function useRotatingCopy(active: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setIndex((current) => (current + 1) % PROCESSING_AMBIENT_COPY.length);
    }, 3200);
    return () => clearInterval(id);
  }, [active]);

  return PROCESSING_AMBIENT_COPY[index];
}

/**
 * The composer's own area, transformed in place while a plan request is
 * in flight (CU17, CU19). `pending`/`processing` are the only real
 * in-flight states the backend reports — this component never claims a
 * finer-grained step ("analizando", "buscando", "armando") is individually
 * "done"; ambient copy under `processing` is illustrative texture, not a
 * checklist.
 *
 * The two failure modes CU17 asks about are handled separately, because
 * they are genuinely different situations:
 *
 * - **Timeout** is ours, not the backend's. The request is still alive and
 *   still being processed, so the offer is to keep waiting (resume polling,
 *   no new POST) or to walk away.
 * - **Failure** is terminal on the backend. There is nothing left to
 *   resume, so the offer is to issue the same request again — which is a
 *   real retry, not the reset that used to hide behind this button.
 */
export function GenerationState({
  phase,
  failure,
  onKeepWaiting,
  onRetry,
  onDiscard,
  canRetry = true,
}: GenerationStateProps) {
  const ambientCopy = useRotatingCopy(phase === "processing");

  if (phase === "failed") {
    return (
      <div className={styles.failedCard} role="alert" aria-live="polite">
        <Icon name="triangle-alert" size={32} className={styles.failedIcon} />
        <p className="sp-h4">No pudimos generar tu plan</p>
        <p className="sp-body">
          {failure?.message ?? "Algo salió mal. Probá de nuevo en un momento."}
        </p>
        <div className={styles.timedOutActions}>
          {canRetry ? (
            <Button variant="ghostEmber" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
          <Button variant="ghostLight" onClick={onDiscard}>
            Volver al buscador
          </Button>
        </div>
      </div>
    );
  }

  const label =
    phase === "submitting" || phase === "pending"
      ? "Tu pedido está en cola"
      : "smartplan está armando tu plan";

  return (
    <div className={styles.generatingCard} aria-live="polite" aria-busy="true">
      <div className={styles.ringStack} aria-hidden="true">
        {[1.8, 1.45, 1.1].map((scale) => (
          <div
            key={scale}
            className={styles.ring}
            style={{
              width: 96,
              height: 96,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          />
        ))}
        <div className={styles.ringTrack} />
        <div className={styles.ringSpinner} />
        <div className={styles.ringCore}>
          <Icon name="sparkles" size={14} />
        </div>
      </div>

      <p className={styles.generatingLabel}>{label}</p>

      {phase === "processing" ? (
        <p className={styles.generatingAmbient}>{ambientCopy}</p>
      ) : null}

      {phase === "timedOut" ? (
        <>
          <p className={styles.generatingAmbient}>
            Sigue tardando más de lo esperado, pero tu pedido sigue en marcha.
          </p>
          <div className={styles.timedOutActions}>
            <Button variant="ghostEmber" onClick={onKeepWaiting}>
              Seguir esperando
            </Button>
            <Button variant="ghostLight" onClick={onDiscard}>
              Descartar
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
