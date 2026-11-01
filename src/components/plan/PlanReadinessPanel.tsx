"use client";

import { Button, Icon, type IconName } from "@/components/ui";
import type {
  PlanPreparationTask,
  PlanReadiness,
  PlanReadinessStage,
} from "@/types";

import styles from "./readiness.module.css";

const STATUS: Record<PlanReadinessStage, { label: string; summary: string; icon: IconName }> = {
  SUGGESTED: { label: "Tu plan para salir", summary: "Elegí cuándo ir para revisar los horarios.", icon: "circle-help" },
  FEASIBLE: { label: "Algunos detalles por confirmar", summary: "Revisá los horarios y precios de las paradas antes de salir.", icon: "info" },
  VERIFIED: { label: "Datos revisados", summary: "Revisá las aclaraciones del recorrido antes de elegirlo.", icon: "circle-check" },
  PREPARATION_REQUIRED: { label: "Te queda algo por resolver", summary: "Completá los pasos pendientes antes de salir.", icon: "clock" },
  READY: { label: "Todo listo para salir", summary: "Horarios y precios revisados, sin pasos obligatorios pendientes.", icon: "circle-check" },
};

const HOME_STATUS: typeof STATUS = {
  SUGGESTED: { label: "Tu plan en casa", summary: "Elegí cuándo hacerlo y revisá qué necesitan.", icon: "house" },
  FEASIBLE: { label: "Algunos detalles por confirmar", summary: "Revisá los materiales y costos de las actividades antes de empezar.", icon: "info" },
  VERIFIED: { label: "Datos revisados", summary: "Revisá las aclaraciones de las actividades antes de elegir el plan.", icon: "circle-check" },
  PREPARATION_REQUIRED: { label: "Te queda algo por resolver", summary: "Completá los pasos pendientes antes de empezar.", icon: "clock" },
  READY: { label: "Todo listo para empezar", summary: "Sin pasos obligatorios pendientes para hacer el plan en casa.", icon: "circle-check" },
};

export interface PlanReadinessPanelProps {
  readiness: PlanReadiness;
  atHome?: boolean;
  /** Present only where the person can act (their own outing to do). */
  onToggleTask?: (task: PlanPreparationTask, confirmed: boolean) => void;
  busyDetailId?: number | null;
  /** Another change is in flight: no task may start a second one. */
  disabled?: boolean;
  error?: string | null;
}

/**
 * How prepared the outing really is. A link to buy tickets is an action, not
 * a purchase: only the person's own confirmation completes a task.
 */
export function PlanReadinessPanel({
  readiness,
  atHome = false,
  onToggleTask,
  busyDetailId = null,
  disabled = false,
  error = null,
}: PlanReadinessPanelProps) {
  const status = (atHome ? HOME_STATUS : STATUS)[readiness.ready ? "READY" : readiness.stage === "READY" ? "FEASIBLE" : readiness.stage];
  const summary = /^(El costo|No podemos|El plan no cubre|Falta resolver)/.test(readiness.summary)
    ? readiness.summary : status.summary;
  return (
    <section className={styles.panel} aria-label={atHome ? "Antes de empezar" : "Antes de salir"} data-ready={readiness.ready}>
      <div className={styles.head}>
        <span className={styles.indicator}><Icon name={status.icon} size={20} aria-hidden="true" /></span>
        <div>
          <h2 className={styles.stage}>{status.label}</h2>
          <p className={styles.summary}>{summary}</p>
        </div>
      </div>

      {readiness.tasks.length > 0 ? (
        <ul className={styles.tasks}>
          {readiness.tasks.map((task) => {
            const confirmed = task.status === "CONFIRMED";
            return (
              <li className={styles.task} key={task.detailId}>
                <div className={styles.taskText}>
                  <span className={styles.taskLabel}>{task.label}</span>
                  <span className={styles.taskNote}>
                    {confirmed
                      ? "Lo marcaste como resuelto."
                      : task.required
                        ? atHome ? "Necesario para empezar." : "Necesario para salir tranquilo."
                        : "Recomendado, no obligatorio."}
                  </span>
                </div>
                <div className={styles.taskActions}>
                  {task.actionUrl && !confirmed ? (
                    <a
                      href={task.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${task.actionLabel ?? "Abrir sitio oficial"} (se abre en otra pestaña)`}
                      className="sp-link"
                    >
                      {task.actionLabel ?? "Abrir sitio oficial"}
                    </a>
                  ) : null}
                  {onToggleTask ? (
                    <Button
                      variant={confirmed ? "ghost" : "secondary"}
                      size="sm"
                      disabled={disabled || busyDetailId === task.detailId}
                      onClick={() => onToggleTask(task, !confirmed)}
                    >
                      {confirmed ? "Deshacer" : "Ya lo resolví"}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
