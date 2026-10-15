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
 *  - `added`  → a record, not a toggle: "Agregado a Mis salidas" plus a link
 *               to that outing. There is no undo here; the outing is
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
        <div className={styles.stateRecord}>
          <p className={styles.stateChip}>
            <span className={styles.stateIcon}>
              <Icon name="circle-check" size={18} aria-hidden="true" />
            </span>
            <span className={styles.stateLabel}>{PLAN_SELECTION.added}</span>
          </p>
          <div className={styles.stateActions}>
            <Link
              href={
                activeOutingId === null
                  ? ROUTES.outings
                  : outingDetailRoute(activeOutingId)
              }
              className={styles.stateLink}
            >
              {PLAN_SELECTION.viewOuting}
              <Icon name="chevron-right" size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
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
        <span className={styles.toggleIcon} aria-hidden="true">
          <Icon
            name={busy ? "loader-circle" : "circle"}
            size={18}
            className={busy ? styles.stateSpinner : styles.toggleIconOff}
          />
        </span>
        <span className={styles.stateLabel}>{PLAN_SELECTION.intend}</span>
      </button>
    </div>
  );
}
