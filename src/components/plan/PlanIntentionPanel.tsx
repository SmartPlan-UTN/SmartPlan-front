"use client";

import Link from "next/link";

import { Icon } from "@/components/ui";
import { outingDetailRoute, ROUTES } from "@/lib/routes";
import type { ViewerPlanState } from "@/types";

import { PLAN_SELECTION } from "./planSelectionContent";
import styles from "./plan.module.css";

/**
 * The viewer's personal state on a plan (CU22, PAN 17, #130). Not an action
 * next to "Guardar"/"Compartir" — a small state surface with its own visual
 * weight.
 *
 *  - `absent` → nothing to show (`view-only`: anonymous, cancelled, an
 *               outing, or a plan the viewer cannot choose).
 *  - `intend` → "Lo voy a hacer", a one-shot action: disabled while it saves.
 *  - `added`  → a record, not a toggle: the same box becomes a link to that
 *               outing, short enough to keep the button's width: it reads
 *               "En Mis salidas", and "Agregado a Mis salidas — Ver en Mis
 *               salidas" to screen readers. There is no undo here; the outing is
 *               cancelled from Mis salidas, with a confirmation.
 */
export type PlanPanelState = "absent" | "intend" | "added";

export function resolvePanelState(
  viewerPlanState: ViewerPlanState,
): PlanPanelState {
  if (viewerPlanState === "selectable") return "intend";
  if (viewerPlanState === "selected") return "added";
  return "absent";
}

export interface PlanIntentionPanelProps {
  viewerPlanState: ViewerPlanState;
  /** The outing "Ver en Mis salidas" opens; Mis salidas itself if unknown. */
  activeOutingId: number | null;
  /** "Lo voy a hacer" is in flight — freeze the control. */
  busy: boolean;
  onIntend: () => void;
}

export function PlanIntentionPanel({
  viewerPlanState,
  activeOutingId,
  busy,
  onIntend,
}: PlanIntentionPanelProps) {
  const state = resolvePanelState(viewerPlanState);
  if (state === "absent") return null;

  if (state === "added") {
    return (
      <div className={styles.statePanel} data-state="added">
        <Link
          href={
            activeOutingId === null
              ? ROUTES.outings
              : outingDetailRoute(activeOutingId)
          }
          className={styles.stateRecord}
        >
          <Icon name="circle-check" size={16} aria-hidden="true" />
          <span className={styles.srOnly}>{PLAN_SELECTION.added}</span>
          <span aria-hidden="true">{PLAN_SELECTION.inOutings}</span>
          <span className={styles.srOnly}>{PLAN_SELECTION.viewOuting}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.statePanel} data-state="intend">
      <button
        type="button"
        className={styles.stateToggle}
        disabled={busy}
        aria-busy={busy}
        onClick={onIntend}
      >
        <Icon
          name={busy ? "loader-circle" : "plus"}
          size={16}
          aria-hidden="true"
          className={busy ? styles.stateSpinner : undefined}
        />
        <span>{PLAN_SELECTION.intend}</span>
      </button>
    </div>
  );
}
