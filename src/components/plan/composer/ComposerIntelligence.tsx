"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Select } from "@/components/ui";
import { checkPlanComposer } from "@/lib/api";
import { activityDetailRoute, placeDetailRoute } from "@/lib/routes";
import { formatArs } from "@/lib/utils";
import type { ComposerCheckPayload, ComposerCheckResult } from "@/types";
import { composerTarget, type ComposerStop } from "./draft";
import styles from "./ComposerIntelligence.module.css";

export function ComposerIntelligence({
  stops,
  peopleCount,
  disabled = false,
  onFindCheaper,
}: {
  stops: ComposerStop[];
  peopleCount: number;
  disabled?: boolean;
  onFindCheaper?: () => void;
}) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("19:00");
  const [budgetRaw, setBudgetRaw] = useState("");
  const [travelMode, setTravelMode] = useState<"drive" | "walk" | "bicycle">(
    "drive",
  );
  const [retry, setRetry] = useState(0);
  const timeRef = useRef<HTMLInputElement>(null);
  const [response, setResponse] = useState<{
    key: string;
    result: ComposerCheckResult | null;
    error: boolean;
  } | null>(null);
  const budget = budgetRaw === "" ? undefined : Number(budgetRaw);
  const payload: ComposerCheckPayload = {
    date,
    startTime,
    peopleCount,
    travelMode,
    ...(budget === undefined ? {} : { budget }),
    stops: stops.map((stop) => ({
      ...composerTarget(stop),
      durationMinutes: stop.estimatedDuration,
    })),
  };
  const key = JSON.stringify(payload);
  const valid = Boolean(
    date &&
    startTime &&
    stops.length > 0 &&
    stops.length <= 12 &&
    peopleCount >= 1 &&
    peopleCount <= 50 &&
    (budget === undefined || (Number.isFinite(budget) && budget > 0)) &&
    stops.every(
      (stop) => stop.estimatedDuration >= 5 && stop.estimatedDuration <= 720,
    ),
  );

  useEffect(() => {
    if (!valid || disabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void checkPlanComposer(
        JSON.parse(key) as ComposerCheckPayload,
        controller.signal,
      )
        .then((result) => {
          if (!controller.signal.aborted)
            setResponse({ key, result, error: false });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResponse({ key, result: null, error: true });
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, retry, valid, disabled]);

  const current = valid && response?.key === key ? response : null;
  const result = current?.result;
  const remaining = result?.budget.remaining;
  const confirmedBudget =
    result?.budget.status === "WITHIN" &&
    result.totals.unpriced === 0 &&
    typeof remaining === "number";
  const issues = result
    ? [...result.issues].sort(
        (a, b) =>
          Number(a.kind === "HOURS_UNKNOWN") -
          Number(b.kind === "HOURS_UNKNOWN"),
      )
    : [];
  return (
    <details id="composer-intelligence" className={styles.panel}>
      <summary>Comprobar un horario</summary>
      <p className={styles.note}>
        Probá día, hora y presupuesto para revisar tu recorrido.
      </p>
      <div className={styles.fields}>
        <label>
          Día
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          Hora de salida
          <input
            ref={timeRef}
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            disabled={disabled}
          />
        </label>
        <label className={styles.wide}>
          Presupuesto total (opcional)
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={budgetRaw}
            onChange={(event) => setBudgetRaw(event.target.value)}
            disabled={disabled}
            placeholder="Para todo el grupo"
          />
        </label>
        <div className={styles.wide}>
          <Select
            aria-label="Cómo se trasladan"
            value={travelMode}
            onChange={setTravelMode}
            disabled={disabled}
            options={[
              { value: "drive", label: "En auto" },
              { value: "walk", label: "Caminando" },
              { value: "bicycle", label: "En bici" },
            ]}
          />
        </div>
      </div>
      {stops.length > 12 ? (
        <p className={styles.note}>
          Podés comprobar recorridos de hasta 12 paradas.
        </p>
      ) : null}
      {valid && !current && !disabled ? (
        <p role="status" className={styles.note}>
          Revisando horarios, precios y traslados…
        </p>
      ) : null}
      {current?.error ? (
        <div role="status">
          <p>No pudimos revisar el recorrido ahora.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRetry((value) => value + 1)}
          >
            Reintentar revisión
          </Button>
        </div>
      ) : null}
      {result ? (
        <div className={styles.result}>
          {confirmedBudget && typeof remaining === "number" ? (
            <p>Te quedarían aproximadamente {formatArs(remaining)}.</p>
          ) : null}
          {result.totals.unpriced > 0 ? (
            <p>
              Falta confirmar el precio de{" "}
              {result.totals.unpriced === 1
                ? "una parada"
                : `${result.totals.unpriced} paradas`}
              .
            </p>
          ) : null}
          <ol className={styles.schedule}>
            {result.stops.map((stop) => (
              <li key={stop.index}>
                <span>
                  {stop.startTime}–{stop.endTime}
                </span>{" "}
                {stop.name}
              </li>
            ))}
          </ol>
          {issues.slice(0, 2).map((issue, index) => (
            <div className={styles.issue} key={`${issue.kind}-${index}`}>
              <p>{issue.message}</p>
              {issue.actions.includes("CHANGE_TIME") ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => timeRef.current?.focus()}
                >
                  Cambiar horario
                </Button>
              ) : null}
              {issue.alternative ? (
                <Link
                  href={
                    issue.alternative.activityId
                      ? activityDetailRoute(issue.alternative.activityId)
                      : placeDetailRoute(issue.alternative.placeId)
                  }
                >
                  Ver alternativa: {issue.alternative.name}
                </Link>
              ) : null}
              {issue.actions.includes("CHEAPER") && onFindCheaper ? (
                <Button variant="ghost" size="sm" disabled={disabled} onClick={onFindCheaper}>
                  Buscar opciones más baratas
                </Button>
              ) : null}
            </div>
          ))}
          {issues.length > 2 ? (
            <details>
              <summary>Ver {issues.length - 2} observaciones más</summary>
              {issues.slice(2).map((issue, index) => (
                <p key={index}>{issue.message}</p>
              ))}
            </details>
          ) : null}
          {result.continuations.length ? (
            <div className={styles.continuations}>
              <h4>Buenas continuaciones</h4>
              <ul>
                {result.continuations.slice(0, 3).map((option) => (
                  <li key={`${option.placeId}-${option.action}`}>
                    <Link
                      href={
                        option.activityId
                          ? activityDetailRoute(option.activityId)
                          : placeDetailRoute(option.placeId)
                      }
                    >
                      {option.name}
                    </Link>
                    <p>{option.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}
