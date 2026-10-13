"use client";

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
}: GenerationStateProps) {
  const waiting = ["submitting", "pending", "processing", "timedOut"].includes(phase);
  const activeStep = STEPS[mode].find((step) => step.id === progressStage);
  const delayed = phase === "timedOut";
  const connectionLost = failure?.code === "STATUS_UNAVAILABLE";

  if (phase === "failed") {
    const timeoutCopy = failure?.code === "GENERATION_TIMEOUT"
      ? { title: "Tu pedido superó el tiempo de espera", body: "No pudimos completar el plan a tiempo. Podés volver a intentarlo." }
      : null;
    const surpriseCopy = timeoutCopy ?? (mode === "surprise" && failure
      ? surpriseGenerationErrorCopy({ code: failure.code })
      : null);

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

          <div className={styles.waitingProgress} role="progressbar" aria-label="Generación en curso">
            <span className={styles.indeterminateTrack} aria-hidden="true" />
          </div>
          {activeStep ? <p className={styles.activeStage} aria-label="Etapa confirmada">{activeStep.label}</p> : null}
          {delayed ? (
            <div role="status">
              <p className="sp-body">{connectionLost ? "No podemos consultar el estado de tu pedido" : "Está tardando más de lo esperado"}</p>
              <p className="sp-body">{connectionLost ? "Revisá tu conexión. Volveremos a consultar el mismo pedido." : "Todavía no recibimos un resultado. Podés seguir esperando o volver."}</p>
            </div>
          ) : null}

          <div className={styles.generationActions}>
            {delayed ? <Button onClick={onKeepWaiting}>Seguir esperando</Button> : null}
            <Button variant="ghostEmber" onClick={onDiscard}>Volver al inicio</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
