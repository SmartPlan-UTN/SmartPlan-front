"use client";

import { Button, Icon } from "@/components/ui";
import type { PlanRequestFailure, PlanRequestPhase } from "@/hooks";
import type { PlanRequestProgressStage } from "@/types";
import { surpriseGenerationErrorCopy } from "@/lib/recommendation/planRequestErrors";

import styles from "./generation.module.css";
import thinking from "./thinking.module.css";

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
  unsupportedExperiences?: string[];
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

/** What the planner is really doing at each confirmed stage, in its own voice. */
const STAGE_HEADLINE: Record<PlanRequestProgressStage, string> = {
  queued: "Recibí tu idea",
  interpreting: "Entendiendo lo que buscás…",
  locating: "Mirando qué hay cerca…",
  searching: "Buscando lugares que realmente encajen…",
  composing: "Eligiendo el que mejor encaja…",
  routing: "Chequeando cómo llegar…",
  finalizing: "Dándole forma a la recomendación…",
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
  progressStage = null,
  unsupportedExperiences = [],
}: GenerationStateProps) {
  const submitting = phase === "submitting" || phase === "submissionDelayed";
  const waiting = submitting || ["pending", "processing", "timedOut"].includes(phase);
  const delayed = phase === "timedOut" || phase === "submissionDelayed";
  const connectionLost = failure?.code === "STATUS_UNAVAILABLE";

  if (phase === "failed") {
    const noAvailablePlans = failure?.code === "NO_VALID_COMBINATIONS";
    const needsLocation = failure?.code === "LOCATION_REQUIRED_FOR_RADIUS";
    const unsupportedCurrency = failure?.code === "UNSUPPORTED_BUDGET_CURRENCY";
    const timeoutCopy = failure?.code === "GENERATION_TIMEOUT"
      ? {
        title: "Tu pedido superó el tiempo de espera",
        body: canRetry
          ? "No pudimos completar el plan a tiempo. Podés volver a intentarlo."
          : "No pudimos completar el plan a tiempo. Volvé al buscador para hacer una nueva búsqueda.",
      }
      : null;
    const unsupportedCopy = noAvailablePlans && unsupportedExperiences.length
      ? {
        title: `Todavía no podemos planificar ${unsupportedExperiences.map((label) => label.toLocaleLowerCase("es-AR")).join(", ")}`,
        body: "Nos faltan horarios o propuestas verificables para lo que pediste. Probá con otra idea para tu salida.",
      }
      : null;
    const surpriseCopy = timeoutCopy ?? unsupportedCopy ?? ((mode === "surprise" || noAvailablePlans || needsLocation || unsupportedCurrency) && failure
      ? surpriseGenerationErrorCopy({ code: failure.code })
      : null);

    return (
      <div className={styles.generationState}>
        <div className={styles.generationCard} role="alert">
          <span className={styles.generationEyebrow}>{noAvailablePlans ? "Sin resultados" : "No salió esta vez"}</span>
          <h2 className="sp-h3">{surpriseCopy?.title ?? "No pudimos generar tu plan"}</h2>
          <p className="sp-body">{surpriseCopy?.body ?? failure?.message ?? "Intentá de nuevo en un momento."}</p>
          <div className={styles.generationActions}>
            {canRetry && !noAvailablePlans && !needsLocation && !unsupportedCurrency ? <Button onClick={onRetry}><Icon name="repeat" size={15} />Reintentar</Button> : null}
            <Button variant="ghostEmber" onClick={onDiscard}>Volver al buscador</Button>
          </div>
        </div>
      </div>
    );
  }

  const steps = STEPS[mode].filter((step) => step.id !== "queued");
  const activeIndex = steps.findIndex((step) => step.id === progressStage);
  const heading = submitting
    ? mode === "surprise"
      ? "Preparando tu sorpresa"
      : "Enviando tu idea…"
    : progressStage
      ? STAGE_HEADLINE[progressStage]
      : mode === "surprise"
        ? WAITING_LABEL[mode].working
        : phase === "pending" || phase === "timedOut"
          ? "Ya recibimos tu idea"
          : "Pensando tu salida…";

  return (
    <section className={thinking.thinking} aria-label="Generando tu plan">
      <div className={thinking.copy} aria-busy={waiting}>
        <p className={thinking.eyebrow}>
          <Icon name="sparkles" size={13} aria-hidden="true" />
          {mode === "surprise" ? "Una sorpresa bien pensada" : "Ya estoy en eso"}
        </p>
        <h2 className={thinking.headline} aria-live="polite" aria-atomic="true">
          {heading}
        </h2>
        {note ? <p className={thinking.note}>{note}</p> : null}
        <div className={thinking.line} role="progressbar" aria-label="Generación en curso">
          <span aria-hidden="true" />
        </div>
        {activeIndex >= 0 ? (
          <p className="sp-sr-only" aria-label="Etapa confirmada">
            {steps[activeIndex].label}
          </p>
        ) : null}
        {!submitting ? (
          <ol className={thinking.steps} aria-label="Etapas">
            {steps.map((step, index) => {
              const state =
                activeIndex < 0
                  ? "pending"
                  : index < activeIndex
                    ? "done"
                    : index === activeIndex
                      ? "active"
                      : "pending";
              return (
                <li key={step.id} data-state={state}>
                  <span className={thinking.mark} aria-hidden="true">
                    {state === "done" ? <Icon name="check" size={12} /> : null}
                  </span>
                  <span>
                    {step.label}
                    {state === "active" ? (
                      <span className="sp-sr-only"> (etapa confirmada)</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}
        {delayed ? (
          <div role="status" className={thinking.delayed}>
            <p>
              {connectionLost
                ? "No podemos consultar el estado de tu pedido"
                : "Está tardando más de lo esperado"}
            </p>
            <p>
              {connectionLost
                ? "Revisá tu conexión. Volveremos a consultar el mismo pedido."
                : "Todavía no recibimos un resultado. Podés seguir esperando o volver."}
            </p>
          </div>
        ) : null}
        <div className={thinking.actions}>
          {delayed ? <Button onClick={onKeepWaiting}>Seguir esperando</Button> : null}
          <Button variant="ghostEmber" onClick={onDiscard}>Volver al inicio</Button>
        </div>
      </div>

      {/* The shape of the answer that is being made. */}
      <div className={thinking.sketch} aria-hidden="true">
        <span className={thinking.sketchImage} />
        <span className={thinking.sketchLine} data-wide="true" />
        <span className={thinking.sketchLine} />
        <span className={thinking.sketchLine} data-short="true" />
      </div>
    </section>
  );
}
