import { RECOMMENDATIONS } from "@/components/landing/landingContent";
import { Icon } from "@/components/ui";

import styles from "./recommended-plans.module.css";

export interface DismissedSlotProps {
  planId: number;
  title: string;
  /** `shown` while "Deshacer" is offered; `collapsing` on the way out. */
  phase: "shown" | "collapsing";
  onUndo: (planId: number) => void;
}

/**
 * Placeholder shown in the rail for a few seconds after a card is dismissed
 * (CU21). It holds the card's width for the whole "Deshacer" window — with a
 * thin bar draining to show how long is left — then collapses once. The rail
 * reflows only after that, never with a jump.
 */
export function DismissedSlot({
  planId,
  title,
  phase,
  onUndo,
}: DismissedSlotProps) {
  return (
    <li className={styles.dismissedSlot} data-phase={phase}>
      <div className={styles.dismissedInner}>
        <span className={styles.dismissedText}>
          <Icon name="circle-check" size={15} aria-hidden="true" />
          {RECOMMENDATIONS.dismiss.done}
        </span>
        {phase === "shown" ? (
          <button
            type="button"
            className={styles.dismissedUndo}
            onClick={() => onUndo(planId)}
          >
            {RECOMMENDATIONS.dismiss.undo}
          </button>
        ) : null}
        <span className={styles.dismissedProgress} aria-hidden="true" />
      </div>
      <span className="sp-sr-only" role="status">
        {RECOMMENDATIONS.dismiss.live(title)}
      </span>
    </li>
  );
}
