import { memo, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { formatDistanceAway } from "@/components/activity/inspect/PlaceParts";
import { Icon } from "@/components/ui";
import { formatArs, formatDuration } from "@/lib/utils";
import type { ActivitySearchResult } from "@/types";

import { IconAction, RouteToggle } from "./IconAction";
import { prefetchActivityDetail } from "./useStopInfo";
import styles from "./ResultRow.module.css";

import { categoryLabel, localizeCatalogText } from "@/lib/utils/catalogLabels";

interface ResultRowProps {
  activity: ActivitySearchResult;
  /** Its number in the route when it is a stop; null when it is not. */
  stopNumber: number | null;
  disabled: boolean;
  /** Show the distance the search reported, when there is one. */
  showDistance: boolean;
  /** Why the assistant picked it, in its words. */
  reason?: string | null;
  /** Its Quick View is open, in place, under the row. */
  expanded?: boolean;
  /** The Quick View itself, shown while `expanded`. */
  children?: ReactNode;
  onInspect: (activity: ActivitySearchResult) => void;
  onAdd: (activity: ActivitySearchResult) => void;
  onRemove: (activityId: number) => void;
  /** Pointed at (hover, focus): its stop in the route and on the map answer. */
  onPoint?: (activityId: number | null) => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * A catalog result as one line: the name (which opens what it is), its
 * facts, and two round actions, ⓘ to look closer and + / ✓ to put it in the
 * route or take it out. Looking and adding never share a target.
 */
export const ResultRow = memo(function ResultRow({
  activity,
  stopNumber,
  disabled,
  showDistance,
  reason = null,
  expanded = false,
  children,
  onInspect,
  onAdd,
  onRemove,
  onPoint,
}: ResultRowProps) {
  const reduceMotion = useReducedMotion();
  const first = activity.categories[0]?.name;
  const category = first ? categoryLabel(first) : undefined;
  const added = stopNumber !== null;
  const panelId = `quick-view-${activity.id}`;
  const warm = () => prefetchActivityDetail(activity.id);
  const infoRef = useRef<HTMLButtonElement>(null);
  // Only a stop has a counterpart to light up (its row in the route, its
  // number on the map), so only a stop reports being pointed at. Leaving
  // always clears: a row taken out of the route while pointed at must not
  // leave its highlight behind.
  const enter = () => {
    if (added) onPoint?.(activity.id);
  };
  const leave = () => onPoint?.(null);

  return (
    <li
      className={`${styles.row} ${expanded ? styles.rowOpen : ""}`}
      data-activity-id={activity.id}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={enter}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          leave();
        }
      }}
      // Esc closes the Quick View open in this row and hands focus back to
      // its ⓘ (the controls inside the Quick View are about to go away).
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !expanded) return;
        event.stopPropagation();
        infoRef.current?.focus({ preventScroll: true });
        onInspect(activity);
      }}
    >
      <div className={styles.line}>
        <div className={styles.copy}>
          <h4>
            <button
              type="button"
              className={styles.name}
              aria-expanded={expanded}
              aria-controls={expanded ? panelId : undefined}
              onClick={() => onInspect(activity)}
              onPointerEnter={warm}
              onFocus={warm}
            >
              {activity.name}
            </button>
          </h4>
          <p>
            {category ? <span>{category}</span> : null}
            <span>{formatDuration(activity.estimatedDuration)}</span>
            <span>{formatArs(activity.estimatedCost)}</span>
            {showDistance && activity.distanceKm !== null ? (
              <span>{formatDistanceAway(activity.distanceKm)}</span>
            ) : null}
          </p>
          {reason ? (
            <p className={styles.reason}>
              <Icon name="sparkles" size={12} aria-hidden="true" />
              {localizeCatalogText(reason)}
            </p>
          ) : activity.description.trim() && !expanded ? (
            <p className={styles.teaser}>{activity.description.trim()}</p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <IconAction
            ref={infoRef}
            tone="quiet"
            aria-label={`Ver detalles de ${activity.name}`}
            aria-expanded={expanded}
            aria-controls={expanded ? panelId : undefined}
            tip={expanded ? "Cerrar detalles" : "Ver detalles"}
            onClick={() => onInspect(activity)}
            onPointerEnter={warm}
            onFocus={warm}
          >
            <Icon name={expanded ? "x" : "info"} size={17} aria-hidden="true" />
          </IconAction>
          <RouteToggle
            name={activity.name}
            stopNumber={stopNumber}
            disabled={disabled}
            onAdd={() => onAdd(activity)}
            onRemove={() => onRemove(activity.id)}
          />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && children ? (
          <motion.div
            key="quick-view"
            id={panelId}
            role="region"
            aria-label={`Detalles de ${activity.name}`}
            className={styles.expansion}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { height: 0, opacity: 0 }
            }
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <div className={styles.expansionInner}>{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
});
