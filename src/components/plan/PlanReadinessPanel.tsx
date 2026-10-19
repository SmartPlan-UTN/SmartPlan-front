"use client";

import { Button } from "@/components/ui";
import type {
  PlanPreparationTask,
  PlanReadiness,
  PlanReadinessStage,
} from "@/types";

import styles from "./readiness.module.css";

const LADDER: { stage: PlanReadinessStage; label: string }[] = [
  { stage: "SUGGESTED", label: "Sugerido" },
  { stage: "FEASIBLE", label: "Viable" },
  { stage: "VERIFIED", label: "Verificado" },
  { stage: "READY", label: "Listo" },
];

/** Where the stage sits on the visible ladder (preparation sits at verified). */
function rank(stage: PlanReadinessStage): number {
  if (stage === "PREPARATION_REQUIRED") return 2;
  return LADDER.findIndex((rung) => rung.stage === stage);
}

export interface PlanReadinessPanelProps {
  readiness: PlanReadiness;
  /** Present only where the person can act (their own outing to do). */
  onToggleTask?: (task: PlanPreparationTask, confirmed: boolean) => void;
  busyDetailId?: number | null;
  error?: string | null;
}

/**
 * How prepared the outing really is. A link to buy tickets is an action, not
 * a purchase: only the person's own confirmation completes a task.
 */
export function PlanReadinessPanel({
  readiness,
  onToggleTask,
  busyDetailId = null,
  error = null,
}: PlanReadinessPanelProps) {
  const reached = rank(readiness.stage);
  return (
    <section className={styles.panel} aria-label="Estado de preparación">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Estado del plan</p>
        <h2 className={styles.stage}>{readiness.label}</h2>
      </div>
      <p className={styles.summary}>{readiness.summary}</p>

      <ol className={styles.ladder} aria-hidden="true">
        {LADDER.map((rung, index) => (
          <li
            key={rung.stage}
            className={`${styles.rung} ${index <= reached ? styles.rungDone : ""}`}
          >
            {rung.label}
          </li>
        ))}
      </ol>

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
                        ? "Necesario para salir tranquilo."
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
                      disabled={busyDetailId === task.detailId}
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
