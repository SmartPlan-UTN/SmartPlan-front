"use client";

import { useEffect, useState } from "react";

import { Button, Icon } from "@/components/ui";
import type { PlanRequestFailure, PlanRequestPhase } from "@/hooks";
import { surpriseGenerationErrorCopy } from "@/lib/recommendation/planRequestErrors";

import styles from "./generation.module.css";

export type GenerationMode = "auto" | "surprise";

// Ambient, illustrative copy only — never presented as completed steps.
// The backend has no sub-status inside `processing`; these phrases just
// give the wait some texture while `processing` is the real, honest state.
const AMBIENT_COPY: Record<GenerationMode, string[]> = {
  auto: [
    "Cruzando actividades compatibles con tu pedido…",
    "Chequeando horarios y disponibilidad…",
    "Armando el orden que más rinde…",
  ],
  surprise: [
    "Mirando qué hay cerca tuyo…",
    "Combinando actividades que pegan…",
    "Eligiendo un orden que valga la pena…",
  ],
};

const WAITING_LABEL: Record<GenerationMode, { queued: string; working: string }> = {
  auto: {
    queued: "Tu pedido está en cola",
    working: "smartplan está armando tu plan",
  },
  surprise: {
    queued: "Estamos eligiendo algo para vos",
    working: "Estamos eligiendo algo para vos",
  },
};

export interface GenerationStateProps {
  phase: Extract<PlanRequestPhase, "submitting" | "pending" | "processing" | "timedOut" | "failed">;
  failure: PlanRequestFailure | null;
  onKeepWaiting: () => void;
  /** Issues the same request again. Only offered when there is one to repeat. */
  onRetry: () => void;
  onDiscard: () => void;
  canRetry?: boolean;
  /** `surprise` swaps the copy; the states and motion are shared (CU19). */
  mode?: GenerationMode;
  /** A one-line, non-intrusive note shown under the waiting label (CU19). */
  note?: string | null;
}

function useRotatingCopy(active: boolean, phrases: string[]): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setIndex((current) => (current + 1) % phrases.length);
    }, 3200);
    return () => clearInterval(id);
  }, [active, phrases]);

  return phrases[index % phrases.length] ?? phrases[0];
}

/**
 * The composer's own area, transformed in place while a plan request is
 * in flight (CU17, CU19). `pending`/`processing` are the only real
 * in-flight states the backend reports — this component never claims a
 * finer-grained step is individually "done"; ambient copy under
 * `processing` is illustrative texture, not a checklist.
 *
 * The two failure modes are handled separately, because they are genuinely
 * different situations:
 *
 * - **Timeout** is ours, not the backend's. The request is still alive and
 *   still being processed, so the offer is to keep waiting (resume polling,
 *   no new POST) or to walk away.
 * - **Failure** is terminal on the backend. There is nothing left to
 *   resume, so the offer is to issue the same request again.
 */
export function GenerationState({
  phase,
  failure,
  onKeepWaiting,
  onRetry,
  onDiscard,
  canRetry = true,
  mode = "auto",
  note = null,
}: GenerationStateProps) {
  const ambientCopy = useRotatingCopy(phase === "processing", AMBIENT_COPY[mode]);

  if (phase === "failed") {
    const surprise = mode === "surprise";
    const copy = surprise
      ? surpriseGenerationErrorCopy({ code: failure?.code ?? null })
      : null;

    return (
      <div className={styles.failedCard} role="alert" aria-live="polite">
        <Icon name="triangle-alert" size={32} className={styles.failedIcon} />
        <p className="sp-h4">{copy?.title ?? "No pudimos generar tu plan"}</p>
        <p className="sp-body">
          {copy?.body ??
            failure?.message ??
            "Algo salió mal. Probá de nuevo en un momento."}
        </p>
        <div className={styles.timedOutActions}>
          {canRetry ? (
            <Button variant="ghostEmber" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
          <Button variant="ghostLight" onClick={onDiscard}>
            {surprise ? "Volver al inicio" : "Volver al buscador"}
          </Button>
        </div>
      </div>
    );
  }

  const labels = WAITING_LABEL[mode];
  const label =
    phase === "submitting" || phase === "pending" ? labels.queued : labels.working;

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

      {note ? <p className={styles.generatingAmbient}>{note}</p> : null}

      {phase === "processing" ? (
        <p className={styles.generatingAmbient}>{ambientCopy}</p>
      ) : null}

      {phase === "timedOut" ? (
        <>
          <p className={styles.generatingAmbient}>
            {mode === "surprise"
              ? "La sorpresa está tardando un poco más de lo esperado, pero tu pedido sigue en marcha."
              : "Sigue tardando más de lo esperado, pero tu pedido sigue en marcha."}
          </p>
          <div className={styles.timedOutActions}>
            <Button variant="ghostEmber" onClick={onKeepWaiting}>
              Seguir esperando
            </Button>
            <Button variant="ghostLight" onClick={onDiscard}>
              {mode === "surprise" ? "Volver" : "Descartar"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
