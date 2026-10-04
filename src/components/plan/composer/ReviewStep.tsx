"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import dynamic from "next/dynamic";

import { Icon } from "@/components/ui";
import { formatArs, formatDuration } from "@/lib/utils";
import type { PlanVisibility } from "@/types";

import type { ComposerStop } from "./draft";
import { getDurationHealth } from "./planDuration";
import type { ReviewMapStop } from "./ReviewMap";
import type { StopInfo } from "./useStopInfo";
import styles from "./ReviewStep.module.css";

const ReviewMap = dynamic(
  () => import("./ReviewMap").then((module) => module.ReviewMap),
  { ssr: false, loading: () => <div className={styles.platePending} /> },
);

interface ReviewStepProps {
  headingRef: Ref<HTMLHeadingElement>;
  title: string;
  description: string;
  peopleCount: number;
  visibility: PlanVisibility;
  stops: ComposerStop[];
  stopInfo: Record<number, StopInfo>;
  totalDuration: number;
  costPerPerson: number;
  isSaving: boolean;
  /** The stop pointed at in the route, or on the map. */
  focusedActivityId: number | null;
  onPoint: (activityId: number | null) => void;
  /** A marker was pressed (its stop is picked), or the map (none is). */
  onRevealStop: (activityId: number | null) => void;
  onEditIdea: () => void;
  onBack: () => void;
  onVisibilityChange: (value: PlanVisibility) => void;
}

const VISIBILITY_OPTIONS = [
  {
    value: "private",
    label: "Solo yo",
    hint: "Solo vos lo ves.",
    icon: "lock",
  },
  {
    value: "public",
    label: "Público",
    hint: "Otras personas pueden encontrarlo.",
    icon: "eye",
  },
] as const;

/**
 * The plan as a finished thing: its name, what it adds up to, who can see
 * it, and where it happens. The map is drawn from the same stops, with the
 * same numbers, as the dark route beside it (which is where the plan is
 * confirmed); pointing at one answers in the other.
 */
export function ReviewStep({
  headingRef,
  title,
  description,
  peopleCount,
  visibility,
  stops,
  stopInfo,
  totalDuration,
  costPerPerson,
  isSaving,
  focusedActivityId,
  onPoint,
  onRevealStop,
  onEditIdea,
  onBack,
  onVisibilityChange,
}: ReviewStepProps) {
  // The same single message as in the route step.
  const health = getDurationHealth(totalDuration);
  const hint = VISIBILITY_OPTIONS.find(
    (option) => option.value === visibility,
  )?.hint;

  // Every stop with a known place, numbered like the route. Stable while the
  // stops are, so the map is framed once and then left to the person.
  const located = useMemo<ReviewMapStop[]>(
    () =>
      stops.flatMap((stop, index) => {
        const coords = stopInfo[stop.activity.id]?.coords;
        return coords
          ? [
              {
                activityId: stop.activity.id,
                number: index + 1,
                name: stop.activity.name,
                coords,
              },
            ]
          : [];
      }),
    [stops, stopInfo],
  );
  const pending = stops.some((stop) => !(stop.activity.id in stopInfo));
  const unlocated = pending ? 0 : stops.length - located.length;
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setMapUnavailable(true), []);
  const showPlate = located.length > 0 && !mapUnavailable;

  // On wide screens the story fills the screen from where it starts, so the
  // map takes exactly the room that is left: no blank band under it.
  const storyRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const story = storyRef.current;
    if (!story) return;
    const measure = () => {
      const top = story.getBoundingClientRect().top + window.scrollY;
      story.style.setProperty("--story-top", `${Math.round(top)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div
      ref={storyRef}
      className={`${styles.story} ${showPlate ? styles.withPlate : ""}`}
    >
      <div className={styles.identity}>
        <button
          type="button"
          className={styles.back}
          onClick={onBack}
          disabled={isSaving}
        >
          <Icon name="arrow-left" size={15} aria-hidden="true" />
          Volver al recorrido
        </button>

        <h2 ref={headingRef} tabIndex={-1} className={styles.title}>
          {title.trim()}
        </h2>
        {description.trim() ? (
          <p className={styles.note}>{description.trim()}</p>
        ) : null}
        <button
          type="button"
          className={styles.edit}
          onClick={onEditIdea}
          disabled={isSaving}
        >
          <Icon name="pencil" size={13} aria-hidden="true" />
          Editar nombre, nota y personas
        </button>
      </div>

      <div className={styles.ledger}>
        <dl className={styles.facts} aria-label="Resumen del plan">
          <div>
            <dt>Paradas</dt>
            <dd>{stops.length}</dd>
          </div>
          <div>
            <dt>Duración</dt>
            <dd
              className={
                health.level === "normal" ? undefined : styles[health.level]
              }
            >
              {formatDuration(totalDuration)}
            </dd>
          </div>
          <div>
            <dt>{peopleCount === 1 ? "Persona" : "Personas"}</dt>
            <dd>{Number.isFinite(peopleCount) ? peopleCount : "—"}</dd>
          </div>
          <div>
            <dt>Por persona</dt>
            <dd>{formatArs(costPerPerson)}</dd>
          </div>
        </dl>

        <fieldset className={styles.visibility}>
          <legend>¿Quién puede verlo?</legend>
          <div className={styles.segments}>
            {VISIBILITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={visibility === option.value ? styles.selected : ""}
              >
                <input
                  type="radio"
                  name="plan-visibility"
                  value={option.value}
                  checked={visibility === option.value}
                  onChange={() => onVisibilityChange(option.value)}
                  disabled={isSaving}
                />
                <Icon name={option.icon} size={15} aria-hidden="true" />
                {option.label}
              </label>
            ))}
          </div>
          <p>{hint}</p>
        </fieldset>
      </div>

      {health.level !== "normal" ? (
        <p
          className={`${styles.health} ${health.exceedsDay ? styles.beyondDay : ""}`}
          role={health.exceedsDay ? "alert" : "status"}
        >
          <Icon
            name={health.exceedsDay ? "triangle-alert" : "clock"}
            size={16}
            aria-hidden="true"
          />
          <span>
            <strong>{health.title}.</strong> {health.message}
          </span>
        </p>
      ) : null}

      {showPlate ? (
        <figure className={styles.plate}>
          <div className={styles.plateMap}>
            <ReviewMap
              stops={located}
              focusedActivityId={focusedActivityId}
              onSelectStop={onRevealStop}
              onPoint={onPoint}
              onUnavailable={onUnavailable}
            />
          </div>
          <figcaption>
            <span className={styles.legLine} aria-hidden="true" />
            Las paradas en orden, unidas en línea recta: no son calles ni
            tiempos de viaje.
            {unlocated > 0 ? (
              <strong>
                {" "}
                {unlocated === 1
                  ? "1 parada no tiene ubicación en el mapa."
                  : `${unlocated} paradas no tienen ubicación en el mapa.`}
              </strong>
            ) : null}
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}
