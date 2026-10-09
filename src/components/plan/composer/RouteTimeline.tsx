"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  Reorder,
  useDragControls,
  useReducedMotion,
} from "motion/react";

import { Icon } from "@/components/ui";
import { formatArs, formatDuration } from "@/lib/utils";

import type { ComposerStop } from "./draft";
import { formatLeg } from "./routeDistance";
import { StopMenu } from "./StopMenu";
import styles from "./RouteTimeline.module.css";

import { categoryLabel } from "@/lib/utils/catalogLabels";
interface RouteTimelineProps {
  stops: ComposerStop[];
  /** Km of the leg after each stop (index i: stop i → i + 1); null if unknown. */
  legs?: (number | null)[];
  /** Stop that was just added: it is brought into view if it is off-screen. */
  highlightedActivityId?: number | null;
  /** Omit the handlers for a read-only route (the review step). */
  editable?: boolean;
  disabled?: boolean;
  onRemove?: (activityId: number) => void;
  onMove?: (activityId: number, direction: -1 | 1) => void;
  /** Dragging produced a new order. */
  onSetOrder?: (stops: ComposerStop[]) => void;
  /** The activity pointed at elsewhere (a row, a marker): its stop answers. */
  linkedActivityId?: number | null;
  /** A stop is pointed at (hover, focus), or no longer is. */
  onPoint?: (activityId: number | null) => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/* A row opens its own space as it arrives and closes it as it leaves, so the
   rows after it, the panel and its footer all move with it instead of the
   panel snapping to its new size while rows are still sliding. The paddings
   are the row's own (RouteTimeline.module.css `.stop`). */
const ROW_OPEN = { height: "auto", paddingTop: 8, paddingBottom: 12 };
const ROW_SHUT = { height: 0, paddingTop: 0, paddingBottom: 0 };
/** A dragged row lifts off the dark route instead of just sliding over it. */
const LIFTED = "0 12px 28px rgb(0 0 0 / 0.45)";

const stopKey = (stop: ComposerStop) =>
  stop.detailId ?? `new-${stop.activity.id}`;

function categoryOf(stop: ComposerStop): string {
  const raw = stop.activity.categories[0]?.name ?? stop.activity.type;
  return raw ? categoryLabel(raw) : "Experiencia";
}

/**
 * The route as a route: numbered nodes joined by one continuous line, drawn
 * on the page itself. Editable, rows are dragged by their handle (pointer and
 * touch) or moved from the row menu (keyboard); rows glide to their new place
 * so every change explains itself. Read-only, it is the very same list with
 * the controls gone, so moving between steps never rebuilds the route.
 */
export function RouteTimeline({
  stops,
  legs = [],
  highlightedActivityId = null,
  editable = false,
  disabled = false,
  onRemove,
  onMove,
  onSetOrder,
  linkedActivityId = null,
  onPoint,
}: RouteTimelineProps) {
  const listRef = useRef<HTMLOListElement>(null);
  // Where keyboard focus should land once the list has re-rendered: a control
  // that moved, or whose row is gone, must not take focus with it.
  const pendingFocusRef = useRef<
    | { kind: "row"; activityId: number }
    | { kind: "index"; index: number }
    | null
  >(null);

  // A moved row keeps its menu focused. A removed row is still in the DOM
  // while it fades out, so focus goes to the neighbour that took its place,
  // looked up among the rows that are still part of the route.
  useLayoutEffect(() => {
    const pending = pendingFocusRef.current;
    const list = listRef.current;
    pendingFocusRef.current = null;
    if (!pending || !list) return;
    if (pending.kind === "row") {
      list
        .querySelector<HTMLElement>(
          `[data-activity-id="${pending.activityId}"]`,
        )
        ?.querySelector<HTMLButtonElement>("[data-menu-trigger]")
        ?.focus();
      return;
    }
    const kept = new Set(stops.map((stop) => stop.activity.id));
    const triggers = [
      ...list.querySelectorAll<HTMLElement>("li[data-activity-id]"),
    ]
      .filter((row) => kept.has(Number(row.dataset.activityId)))
      .map((row) => row.querySelector<HTMLButtonElement>("[data-menu-trigger]"));
    triggers[Math.min(pending.index, triggers.length - 1)]?.focus();
  }, [stops]);

  // Bring a freshly added stop into view only when it landed off-screen.
  useEffect(() => {
    if (highlightedActivityId === null) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-activity-id="${highlightedActivityId}"]`,
    );
    if (!row?.getBoundingClientRect) return;
    const { top, bottom } = row.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) {
      row.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }
  }, [highlightedActivityId]);

  // Stable while the handlers above are, so the memoized rows only re-render
  // when something about them changed.
  const handleMove = useCallback(
    (activityId: number, direction: -1 | 1) => {
      pendingFocusRef.current = { kind: "row", activityId };
      onMove?.(activityId, direction);
    },
    [onMove],
  );

  const handleRemove = useCallback(
    (activityId: number, index: number) => {
      pendingFocusRef.current = { kind: "index", index };
      onRemove?.(activityId);
    },
    [onRemove],
  );

  return (
    <MotionConfig reducedMotion="user">
      <Reorder.Group
        ref={listRef}
        as="ol"
        axis="y"
        values={stops}
        onReorder={(next: ComposerStop[]) => {
          if (editable) onSetOrder?.(next);
        }}
        className={`${styles.timeline} ${editable ? "" : styles.readOnly}`}
        aria-label="Paradas en orden"
      >
        <AnimatePresence initial={false}>
          {stops.map((stop, index) => (
            <Stop
              key={stopKey(stop)}
              stop={stop}
              index={index}
              count={stops.length}
              leg={legs[index] ?? null}
              fresh={highlightedActivityId === stop.activity.id}
              linked={linkedActivityId === stop.activity.id}
              editable={editable}
              disabled={disabled}
              onMove={handleMove}
              onRemove={handleRemove}
              onPoint={onPoint}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </MotionConfig>
  );
}

const Stop = memo(function Stop({
  stop,
  index,
  count,
  leg,
  fresh,
  linked,
  editable,
  disabled,
  onMove,
  onRemove,
  onPoint,
}: {
  stop: ComposerStop;
  index: number;
  count: number;
  leg: number | null;
  fresh: boolean;
  linked: boolean;
  editable: boolean;
  disabled: boolean;
  onMove: (activityId: number, direction: -1 | 1) => void;
  onRemove: (activityId: number, index: number) => void;
  onPoint?: (activityId: number | null) => void;
}) {
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();

  return (
    <Reorder.Item
      as="li"
      value={stop}
      data-activity-id={stop.activity.id}
      className={`${styles.stop} ${fresh ? styles.fresh : ""} ${linked ? styles.linked : ""}`}
      onPointerEnter={() => onPoint?.(stop.activity.id)}
      onPointerLeave={() => onPoint?.(null)}
      onFocus={() => onPoint?.(stop.activity.id)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onPoint?.(null);
        }
      }}
      drag={editable ? "y" : false}
      dragListener={false}
      dragControls={controls}
      initial={reduceMotion ? false : { opacity: 0, ...ROW_SHUT }}
      animate={{ opacity: 1, ...ROW_OPEN }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0 } }
          : { opacity: 0, ...ROW_SHUT, transition: { duration: 0.2, ease: EASE_OUT } }
      }
      transition={{ duration: 0.24, ease: EASE_OUT }}
      whileDrag={{ scale: 1.02, zIndex: 3, boxShadow: LIFTED }}
    >
      <StopContent
        stop={stop}
        index={index}
        leg={leg}
        actions={
          editable ? (
            <div className={styles.actions}>
              <span
                className={styles.grip}
                aria-hidden="true"
                onPointerDown={(event) => {
                  if (disabled) return;
                  // Dragging must not also select the text under the pointer.
                  event.preventDefault();
                  controls.start(event);
                }}
              >
                <Icon name="grip-vertical" size={18} />
              </span>
              <StopMenu
                name={stop.activity.name}
                index={index}
                count={count}
                disabled={disabled}
                onMove={(direction) => onMove(stop.activity.id, direction)}
                onRemove={() => onRemove(stop.activity.id, index)}
              />
            </div>
          ) : null
        }
      />
    </Reorder.Item>
  );
});

function StopContent({
  stop,
  index,
  leg,
  actions,
}: {
  stop: ComposerStop;
  index: number;
  leg: number | null;
  actions?: ReactNode;
}) {
  return (
    <>
      <span className={styles.node} aria-hidden="true">
        {index + 1}
      </span>
      <div className={styles.text}>
        <strong title={stop.activity.name}>{stop.activity.name}</strong>
        <span className={styles.meta}>
          <span>{categoryOf(stop)}</span>
          <span>{formatDuration(stop.estimatedDuration)}</span>
          <span>{formatArs(stop.estimatedCost)}</span>
        </span>
      </div>
      {actions}
      {leg !== null ? (
        // The arrow says "to the next stop"; that it is a straight line (an
        // estimate, never a driving distance) is said in words to screen
        // readers and in the route's own summary.
        <span className={styles.leg}>
          <Icon name="arrow-down" size={12} aria-hidden="true" />
          {formatLeg(leg).replace("≈ ", "")}
          <span className={styles.srOnly}>
            {" "}
            en línea recta hasta la siguiente parada
          </span>
        </span>
      ) : null}
    </>
  );
}
