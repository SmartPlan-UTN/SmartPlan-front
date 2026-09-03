"use client";

import type { ReactNode } from "react";

import { Icon } from "@/components/ui";
import type { PlanStatusKey, ViewerPlanState } from "@/types";

import { PLAN_SELECTION } from "./planSelectionContent";
import styles from "./plan.module.css";

/**
 * The viewer's personal state on a plan (CU22, PAN 17). Not an action next to
 * "Guardar"/"Compartir" — a small state surface with its own visual weight.
 *
 *  - `absent`     → nothing to show (anonymous, `view-only`, or a finished plan
 *                   the viewer never intended).
 *  - `intend`     → toggle, off.
 *  - `intending`  → same toggle, on. The label stays "Lo voy a hacer" in both
 *                   states — the check and the fill carry the change; clicking
 *                   again withdraws, no separate control.
 *  - `done`       → record: "Hiciste este plan". Date + feedback actions are
 *                   CU23 — the slots exist but stay empty until then.
 */
export type PlanPanelState = "absent" | "intend" | "intending" | "done";

export function resolvePanelState(
  viewerPlanState: ViewerPlanState,
  statusKey: PlanStatusKey,
): PlanPanelState {
  if (statusKey === "completed") {
    // Only a viewer who actually marked the plan gets the "hiciste este plan"
    // record; for everyone else the hero pill ("Realizado") already says it.
    return viewerPlanState === "selected" ? "done" : "absent";
  }
  if (viewerPlanState === "selectable") return "intend";
  if (viewerPlanState === "selected") return "intending";
  return "absent";
}

function formatCompletedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(date);
}

export interface PlanIntentionPanelProps {
  viewerPlanState: ViewerPlanState;
  statusKey: PlanStatusKey;
  /** A `select`/`deselect` call is in flight — freeze the control. */
  busy: boolean;
  onIntend: () => void;
  onWithdraw: () => void;
  /** CU23, not wired yet: ISO date the plan was completed. */
  completedAt?: string | null;
  /** CU23, not wired yet: feedback actions for a completed plan. */
  feedbackSlot?: ReactNode;
}

export function PlanIntentionPanel({
  viewerPlanState,
  statusKey,
  busy,
  onIntend,
  onWithdraw,
  completedAt,
  feedbackSlot,
}: PlanIntentionPanelProps) {
  const state = resolvePanelState(viewerPlanState, statusKey);
  if (state === "absent") return null;

  if (state === "done") {
    return (
      <div className={styles.statePanel} data-state="done">
        <div className={styles.stateRecord}>
          <p className={styles.stateChip}>
            <span className={`${styles.stateIcon} ${styles.stateIconMuted}`}>
              <Icon name="circle-check" size={18} aria-hidden="true" />
            </span>
            <span className={styles.stateLabel}>
              {PLAN_SELECTION.detail.completed}
            </span>
          </p>
          {completedAt ? (
            <time className={styles.stateMeta} dateTime={completedAt}>
              {formatCompletedAt(completedAt)}
            </time>
          ) : null}
          {feedbackSlot ? (
            <div className={styles.stateActions}>{feedbackSlot}</div>
          ) : null}
        </div>
      </div>
    );
  }

  // `intend` / `intending` are one toggle: same element, same box, same label.
  // Click to mark, click again to withdraw. `aria-pressed` is what conveys the
  // state to assistive tech; the check and the fill convey it visually.
  const on = state === "intending";
  return (
    <div className={styles.statePanel} data-state={state}>
      <button
        type="button"
        className={styles.stateToggle}
        aria-pressed={on}
        disabled={busy}
        onClick={on ? onWithdraw : onIntend}
      >
        <span className={styles.toggleIcon} aria-hidden="true">
          <Icon name="circle" size={18} className={styles.toggleIconOff} />
          <Icon name="circle-check" size={18} className={styles.toggleIconOn} />
        </span>
        <span className={styles.stateLabel}>{PLAN_SELECTION.detail.intend}</span>
      </button>
    </div>
  );
}
