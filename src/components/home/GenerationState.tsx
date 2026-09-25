"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Icon } from "@/components/ui";
import type { PlanRequestFailure, PlanRequestPhase } from "@/hooks";
import type { PlanRequestProgressStage } from "@/types";
import { surpriseGenerationErrorCopy } from "@/lib/recommendation/planRequestErrors";

import styles from "./generation.module.css";

export type GenerationMode = "auto" | "surprise";

export interface GenerationStateProps {
  phase: Exclude<PlanRequestPhase, "idle">;
  failure: PlanRequestFailure | null;
  onKeepWaiting: () => void;
  onRetry: () => void;
  onDiscard: () => void;
  canRetry?: boolean;
  mode?: GenerationMode;
  note?: string | null;
  query?: string | null;
  progressStage?: PlanRequestProgressStage | null;
  progressStageAt?: string | null;
  requestedAt?: string | null;
  estimatedRemainingSeconds?: number | null;
}

type Step = { id: PlanRequestProgressStage; label: string };

const STEPS: Record<GenerationMode, Step[]> = {
  auto: [
    { id: "queued", label: "Solicitud recibida" },
    { id: "interpreting", label: "Entendiendo tu idea" },
    { id: "locating", label: "Definiendo la zona" },
    { id: "searching", label: "Buscando actividades" },
    { id: "composing", label: "Combinando el itinerario" },
    { id: "routing", label: "Calculando recorridos" },
    { id: "finalizing", label: "Preparando tus opciones" },
  ],
  surprise: [
    { id: "queued", label: "Solicitud recibida" },
    { id: "locating", label: "Mirando qué hay cerca" },
    { id: "searching", label: "Buscando actividades" },
    { id: "composing", label: "Combinando el itinerario" },
    { id: "routing", label: "Calculando recorridos" },
    { id: "finalizing", label: "Preparando tus opciones" },
  ],
};

const WAITING_LABEL: Record<GenerationMode, { queued: string; working: string }> = {
  auto: {
    queued: "Empezamos a armar tu plan",
    working: "Estamos convirtiendo tu idea en una salida",
  },
  surprise: {
    queued: "Estamos eligiendo algo para vos",
    working: "Estamos eligiendo algo para vos",
  },
};

function elapsedLabel(start: string | null | undefined, now: number): string | null {
  if (!start) return null;
  const seconds = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return null;
  if (seconds < 60) return `${seconds} s transcurridos`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder < 10 ? `${minutes} min transcurridos` : `${minutes} min ${remainder} s transcurridos`;
}

function remainingLabel(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0 || !Number.isFinite(seconds)) return null;
  if (seconds < 60) return `Estimamos unos ${seconds} s más`;
  return `Estimamos unos ${Math.ceil(seconds / 60)} min más`;
}

export function GenerationState({
  phase,
  failure,
  onKeepWaiting,
  onRetry,
  onDiscard,
  canRetry = true,
  mode = "auto",
  note,
  query,
  progressStage = null,
  progressStageAt,
  requestedAt,
  estimatedRemainingSeconds,
}: GenerationStateProps) {
  const [now, setNow] = useState(() => Date.now());
  const waiting = phase === "submitting" || phase === "pending" || phase === "processing";
  const steps = STEPS[mode];
  const activeIndex = progressStage ? steps.findIndex((step) => step.id === progressStage) : -1;
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : null;
  const elapsed = useMemo(() => elapsedLabel(requestedAt, now), [now, requestedAt]);
  const stageElapsed = useMemo(() => elapsedLabel(progressStageAt, now), [now, progressStageAt]);
  const remaining = remainingLabel(estimatedRemainingSeconds);
  const hasActiveStage = activeIndex >= 0;

  useEffect(() => {
    if (!waiting || !requestedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [requestedAt, waiting]);

  if (phase === "failed") {
    const surpriseCopy = mode === "surprise" && failure
      ? surpriseGenerationErrorCopy({ code: failure.code })
      : null;

    return (
      <div className={styles.generationState}>
        <div className={styles.generationCard} role="alert">
          <span className={styles.generationEyebrow}>No salió esta vez</span>
          <h2 className="sp-h3">{surpriseCopy?.title ?? "No pudimos generar tu plan"}</h2>
          <p className="sp-body">{surpriseCopy?.body ?? failure?.message ?? "Intentá de nuevo en un momento."}</p>
          <div className={styles.generationActions}>
            {canRetry ? <Button onClick={onRetry}><Icon name="repeat" size={15} />Reintentar</Button> : null}
            <Button variant="ghostEmber" onClick={onDiscard}>Volver al buscador</Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "timedOut") {
    return (
      <div className={styles.generationState}>
        <div className={styles.generationCard}>
          <span className={styles.generationEyebrow}>Seguimos en eso</span>
          <h2 className="sp-h3">Sigue tardando más de lo esperado</h2>
          <p className="sp-body">La búsqueda sigue activa. Podés quedarte y retomamos el mismo pedido.</p>
          <div className={styles.generationActions}>
            <Button onClick={onKeepWaiting}>Seguir esperando</Button>
            <Button variant="ghostEmber" onClick={onDiscard}>Volver al buscador</Button>
          </div>
        </div>
      </div>
    );
  }

  const heading = phase === "submitting"
    ? mode === "surprise" ? "Preparando tu sorpresa" : "Enviando tu búsqueda"
    : activeStep && activeStep.id !== "queued"
      ? activeStep.label
      : phase === "pending"
        ? mode === "surprise" ? WAITING_LABEL[mode].queued : "Ya recibimos tu búsqueda"
        : phase === "processing"
          ? WAITING_LABEL[mode].working
          : WAITING_LABEL[mode].queued;

  return (
    <section className={styles.generationState} aria-label="Generando tu plan">
      <div className={styles.generationCard} aria-busy={waiting}>
        <div className={styles.generationCopy} aria-busy={waiting}>
          <span className={styles.generationEyebrow}>
            <Icon name="sparkles" size={13} aria-hidden="true" />
            {mode === "surprise" ? "Una sorpresa bien pensada" : "Tu próxima salida"}
          </span>
          <h2 className="sp-h3" aria-live="polite" aria-atomic="true">{heading}</h2>
          {query ? <p className={styles.generationQuery}>“{query}”</p> : null}
          {note ? <p className={styles.generationNote}>{note}</p> : null}

          {hasActiveStage ? (
            <ol className={styles.progressSteps} aria-label="Etapas confirmadas">
              {steps.slice(0, activeIndex + 1).map((step, index) => {
                const active = step.id === progressStage;
                const confirmed = index < activeIndex;
                return (
                  <li
                    key={step.id}
                    className={styles.progressStep}
                    data-active={active}
                    data-confirmed={confirmed}
                    aria-current={active ? "step" : undefined}
                  >
                    <span className={styles.stepMark} aria-hidden="true">
                      {confirmed ? <Icon name="check" size={11} /> : active ? <span className={styles.stepDot} /> : null}
                    </span>
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className={styles.waitingProgress} role="progressbar" aria-label={heading} aria-valuetext={heading}>
              <span className={styles.indeterminateTrack} aria-hidden="true" />
            </div>
          )}

          {activeStep && stageElapsed ? <p className={styles.activeStage}>{stageElapsed.replace(" transcurridos", " en esta etapa")}</p> : null}
          {elapsed || remaining ? (
            <p className={styles.generationTiming} aria-live="polite">
              {elapsed}{elapsed && remaining ? <span aria-hidden="true"> · </span> : null}{remaining}
            </p>
          ) : null}

          <div className={styles.generationActions}>
            <Button variant="ghostEmber" onClick={onDiscard}>Volver al inicio</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
