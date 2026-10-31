"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Icon, Select } from "@/components/ui";
import { checkPlanComposer } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import type { ComposerCheckPayload, ComposerCheckResult } from "@/types";

import type { AdaptSource } from "./AdaptBanner";
import { composerTarget, type ComposerStop } from "./draft";
import { PEOPLE_MAX, PEOPLE_MIN, TITLE_MAX, validatePeople, validateTitle } from "./limits";
import ideaStyles from "./IdeaStep.module.css";
import styles from "./adaptStep.module.css";

export interface AdaptContext {
  date: string;
  startTime: string;
  /** Total for the whole group, as typed; empty means no budget. */
  budget: string;
  travelMode: "drive" | "walk" | "bicycle";
}

export const DEFAULT_ADAPT_CONTEXT: AdaptContext = {
  date: "",
  startTime: "19:00",
  budget: "",
  travelMode: "drive",
};

type Hours = ComposerCheckResult["stops"][number]["hours"];

const VERDICT: Record<Hours, { tone: "ok" | "warn" | "bad" | "idle"; label: (stop: ComposerCheckResult["stops"][number]) => string }> = {
  CONFIRMED_OPEN: { tone: "ok", label: (stop) => `Abierto cuando llegás, ${stop.startTime}` },
  CLOSES_DURING: { tone: "warn", label: (stop) => `Cierra ${stop.closesAt ? `a las ${stop.closesAt}` : "durante la visita"}` },
  CLOSED: { tone: "bad", label: (stop) => `Cerrado a las ${stop.startTime}` },
  UNKNOWN: { tone: "idle", label: () => "Horario sin confirmar" },
};

/** `YYYY-MM-DD` in the person's own day, `offset` days from today. */
function localDate(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function nextSaturday(): string {
  const today = new Date().getDay();
  return localDate((6 - today + 7) % 7 || 7);
}

export interface AdaptStepProps {
  source: AdaptSource;
  title: string;
  titleError: string | null;
  peopleCount: number;
  peopleError: string | null;
  stops: ComposerStop[];
  totalLabel: string;
  totalCost: number | null;
  perPersonLabel: string;
  duration: number;
  context: AdaptContext;
  isSaving: boolean;
  onTitleChange: (value: string) => void;
  onPeopleCountChange: (value: number) => void;
  onContextChange: (next: AdaptContext) => void;
  onRemoveStop: (activityId: number) => void;
  /** Takes the stop out and opens the catalog to pick another. */
  onSwapStop: (activityId: number) => void;
  onFindCheaper: () => void;
  onContinue: () => void;
  onReview: () => void;
}

/**
 * The first thing a person sees when they adapt someone else's plan. Not a
 * form about the plan, but about *their outing*: who is going, when, with how
 * much. The engine the Plan Creator already uses answers, stop by stop,
 * whether the original still works for them, and what they change is
 * compared with the original they started from.
 */
export function AdaptStep({
  source,
  title,
  titleError,
  peopleCount,
  peopleError,
  stops,
  totalLabel,
  totalCost,
  perPersonLabel,
  duration,
  context,
  isSaving,
  onTitleChange,
  onPeopleCountChange,
  onContextChange,
  onRemoveStop,
  onSwapStop,
  onFindCheaper,
  onContinue,
  onReview,
}: AdaptStepProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState<{ key: string; result: ComposerCheckResult | null } | null>(null);
  const people = Number.isFinite(peopleCount) ? peopleCount : 0;
  const budget = context.budget === "" ? undefined : Number(context.budget);

  const payload: ComposerCheckPayload = {
    date: context.date,
    startTime: context.startTime,
    peopleCount,
    travelMode: context.travelMode,
    ...(budget === undefined ? {} : { budget }),
    stops: stops.map((stop) => ({ ...composerTarget(stop), durationMinutes: stop.estimatedDuration })),
  };
  const key = JSON.stringify(payload);
  const valid =
    Boolean(context.date && context.startTime) &&
    stops.length > 0 &&
    stops.length <= 12 &&
    people >= 1 &&
    people <= 50 &&
    (budget === undefined || (Number.isFinite(budget) && budget > 0)) &&
    stops.every((stop) => stop.estimatedDuration >= 5 && stop.estimatedDuration <= 720);

  useEffect(() => {
    if (!valid || isSaving) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void checkPlanComposer(JSON.parse(key) as ComposerCheckPayload, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setResponse({ key, result });
        })
        .catch(() => {
          if (!controller.signal.aborted) setResponse({ key, result: null });
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, retry, valid, isSaving]);

  const current = valid && response?.key === key ? response : null;
  const result = current?.result ?? null;
  const checking = valid && !current;
  const failed = Boolean(current && !current.result);
  // Over budget by the engine's word, or because what is already priced passes it.
  const overBudget =
    result?.budget.status === "EXCEEDS" || (budget !== undefined && totalCost !== null && totalCost > budget);
  const problems = result ? result.stops.filter((stop) => stop.hours === "CLOSED" || stop.hours === "CLOSES_DURING").length : 0;
  const confirmedStops = result ? result.stops.filter((stop) => stop.hours === "CONFIRMED_OPEN").length : 0;
  const unknownStops = result ? result.stops.length - confirmedStops - problems : 0;
  // Never claim more than we know: "todo te sirve" only when every hour is confirmed.
  const routeSummary = !context.date
    ? "Elegí un día para comprobar los horarios."
    : checking
      ? "Revisando horarios, precios y traslados…"
      : failed
        ? "No pudimos comprobarlo ahora."
        : !result
          ? ""
          : problems > 0
            ? `${problems === 1 ? "Una parada necesita" : `${problems} paradas necesitan`} un cambio.`
            : unknownStops === result.stops.length
              ? "No tenemos horarios confirmados para estas paradas: revisalos antes de ir."
              : unknownStops > 0
                ? `${confirmedStops === 1 ? "Una parada está" : `${confirmedStops} paradas están`} abierta${confirmedStops === 1 ? "" : "s"} cuando llegás; en las otras no pudimos confirmar el horario.`
                : "Todo el recorrido te sirve ese día.";
  // When nothing could be confirmed, saying so once beats saying it on every stop.
  const showStopVerdicts = result ? unknownStops < result.stops.length : false;

  const cost = totalCost !== null && source.totalCost !== null ? totalCost - source.totalCost : null;
  const set = (patch: Partial<AdaptContext>) => onContextChange({ ...context, ...patch });
  const visibleTitleError = titleError ?? (title.length > 0 ? validateTitle(title) : null);
  const visiblePeopleError = peopleError ?? (Number.isNaN(peopleCount) ? validatePeople(peopleCount) : null);

  return (
    <form
      className={`${ideaStyles.form} ${styles.adapt}`}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <div className={ideaStyles.copy}>
        <header className={styles.header}>
          <h2 className={styles.heading}>Contanos cómo lo vas a hacer vos</h2>
          <p className={styles.lead}>
            Partimos de «{source.title}»{source.authorUsername ? ` de @${source.authorUsername}` : ""}. Revisamos si te
            sirve el día que elegís; el original no se toca.
          </p>
        </header>

        <div className={ideaStyles.nameField}>
          <label htmlFor="adapt-title" className={ideaStyles.nameLabel}>
            Nombre de tu versión
          </label>
          <textarea
            id="adapt-title"
            ref={titleRef}
            className={ideaStyles.nameInput}
            rows={1}
            value={title}
            maxLength={TITLE_MAX}
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(visibleTitleError)}
            aria-describedby={visibleTitleError ? "adapt-title-error" : undefined}
            onChange={(event) => onTitleChange(event.target.value.replace(/\s*\n\s*/g, " "))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onContinue();
              }
            }}
            disabled={isSaving}
          />
          {visibleTitleError ? (
            <small id="adapt-title-error" role="alert">
              {visibleTitleError}
            </small>
          ) : null}
        </div>

        <fieldset className={styles.when} disabled={isSaving}>
          <legend>¿Cuándo y con quién?</legend>
          <div className={ideaStyles.people}>
            <span aria-hidden="true">Somos</span>
            <div className={ideaStyles.stepper}>
              <button
                type="button"
                aria-label="Una persona menos"
                onClick={() => onPeopleCountChange(Math.max(PEOPLE_MIN, people - 1))}
                disabled={people <= PEOPLE_MIN}
              >
                <Icon name="minus" size={16} aria-hidden="true" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={PEOPLE_MIN}
                max={PEOPLE_MAX}
                step={1}
                value={Number.isNaN(peopleCount) ? "" : peopleCount}
                aria-label="Cantidad de personas"
                aria-invalid={Boolean(visiblePeopleError)}
                onChange={(event) => onPeopleCountChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
              />
              <button
                type="button"
                aria-label="Una persona más"
                onClick={() => onPeopleCountChange(Math.min(PEOPLE_MAX, people + 1))}
                disabled={people >= PEOPLE_MAX}
              >
                <Icon name="plus" size={16} aria-hidden="true" />
              </button>
            </div>
            <span aria-hidden="true">{people === 1 ? "persona" : "personas"}</span>
          </div>
          {visiblePeopleError ? (
            <small role="alert" className={ideaStyles.error}>
              {visiblePeopleError}
            </small>
          ) : null}

          <div className={styles.fields}>
            <div className={styles.dateField}>
              <label htmlFor="adapt-date">Día</label>
              <input id="adapt-date" type="date" value={context.date} onChange={(event) => set({ date: event.target.value })} />
              <div className={styles.quickDays} role="group" aria-label="Días a mano">
                {[
                  ["Hoy", localDate(0)],
                  ["Mañana", localDate(1)],
                  ["Este sábado", nextSaturday()],
                ].map(([label, value]) => (
                  <button key={label} type="button" aria-pressed={context.date === value} onClick={() => set({ date: value })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="adapt-time">Salimos a las</label>
              <input id="adapt-time" type="time" value={context.startTime} onChange={(event) => set({ startTime: event.target.value })} />
            </div>
            <div>
              <label htmlFor="adapt-budget">
                Presupuesto <em>opcional</em>
              </label>
              <input
                id="adapt-budget"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="Para todo el grupo"
                value={context.budget}
                onChange={(event) => set({ budget: event.target.value })}
              />
            </div>
            <div>
              <span className={styles.selectLabel} id="adapt-travel-label">
                Nos movemos
              </span>
              <Select
                aria-labelledby="adapt-travel-label"
                value={context.travelMode}
                onChange={(value) => set({ travelMode: value })}
                options={[
                  { value: "drive", label: "En auto" },
                  { value: "walk", label: "Caminando" },
                  { value: "bicycle", label: "En bici" },
                ]}
              />
            </div>
          </div>
        </fieldset>

        <section className={styles.route} aria-labelledby="adapt-route-heading" aria-busy={checking}>
          <div className={styles.routeHead}>
            <h3 id="adapt-route-heading">El recorrido, para tu día</h3>
            <p role="status" aria-live="polite">
              {routeSummary}
              {failed ? (
                <button type="button" className={styles.retry} onClick={() => setRetry((value) => value + 1)}>
                  Reintentar
                </button>
              ) : null}
            </p>
          </div>
          <ol className={styles.stops}>
            {stops.map((stop, index) => {
              const checked = result?.stops[index];
              const verdict = checked ? VERDICT[checked.hours] : null;
              const needsChange = checked?.hours === "CLOSED" || checked?.hours === "CLOSES_DURING";
              return (
                <li key={`${stop.activity.id}-${index}`} data-tone={verdict?.tone ?? "idle"}>
                  <span className={styles.index} aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className={styles.stopBody}>
                    <strong>{stop.activity.name}</strong>
                    <span className={styles.stopMeta}>
                      {formatDuration(stop.estimatedDuration)}
                      {checked?.travelMinutesFromPrevious ? ` · ${checked.travelMinutesFromPrevious} min desde la anterior` : ""}
                    </span>
                    {checked && verdict && showStopVerdicts ? (
                      <span className={styles.verdict} data-tone={verdict.tone}>
                        {verdict.label(checked)}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.stopActions}>
                    {needsChange ? (
                      <button type="button" className={styles.swap} onClick={() => onSwapStop(stop.activity.id)}>
                        Cambiar por otra
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Quitar ${stop.activity.name}`}
                      onClick={() => onRemoveStop(stop.activity.id)}
                      disabled={stops.length <= 1}
                    >
                      <Icon name="x" size={14} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {overBudget && budget !== undefined ? (
            <p className={styles.budgetNote} role="status">
              Con {people} {people === 1 ? "persona" : "personas"} el recorrido cuesta {totalLabel}, y tu presupuesto es de $
              {Math.round(budget).toLocaleString("es-AR")}.{" "}
              <button type="button" className={styles.retry} onClick={onFindCheaper}>
                Ver opciones más baratas
              </button>
            </p>
          ) : result && typeof result.budget.remaining === "number" && result.budget.status === "WITHIN" ? (
            <p className={styles.budgetNote} role="status">
              Te quedarían aproximadamente ${Math.round(result.budget.remaining).toLocaleString("es-AR")}.
            </p>
          ) : result && budget !== undefined && result.budget.status === "UNCERTAIN" ? (
            <p className={styles.budgetNote} role="status">
              Faltan precios por confirmar: no podemos asegurar que entre en tu presupuesto.
            </p>
          ) : null}
        </section>

        <section className={styles.compare} aria-label="Tu versión frente al original">
          <div>
            <p className={styles.compareLabel}>Original</p>
            <p className={styles.compareValue}>{source.totalLabel}</p>
            <p className={styles.compareMeta}>
              {source.peopleCount} {source.peopleCount === 1 ? "persona" : "personas"} · {formatDuration(source.duration)}
            </p>
          </div>
          <Icon name="arrow-right" size={18} aria-hidden="true" />
          <div>
            <p className={styles.compareLabel}>Tu versión</p>
            <p className={styles.compareValue}>
              {totalLabel}
              {cost !== null && cost !== 0 ? (
                <span className={styles.delta} data-direction={cost < 0 ? "down" : "up"}>
                  {cost < 0 ? "−" : "+"}${Math.abs(Math.round(cost)).toLocaleString("es-AR")}
                </span>
              ) : null}
            </p>
            <p className={styles.compareMeta}>
              {people} {people === 1 ? "persona" : "personas"} · {formatDuration(duration)} · {perPersonLabel} por persona
            </p>
          </div>
        </section>

        <div className={ideaStyles.actions}>
          <Button type="submit" variant="primary" size="lg" disabled={isSaving}>
            Ajustar el recorrido
            <Icon name="arrow-right" size={16} aria-hidden="true" />
          </Button>
          <button type="button" className={styles.skip} onClick={onReview} disabled={isSaving}>
            Así está bien, revisar
          </button>
          <p>No se guarda nada hasta que confirmes.</p>
        </div>
      </div>
    </form>
  );
}
