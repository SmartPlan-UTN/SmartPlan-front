"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/hooks";
import type { PlanFunnel } from "@/types";

import styles from "./decision-trail.module.css";

export interface DecisionTrailProps {
  funnel: PlanFunnel;
  /** How many options reached the final selection. */
  finalists: number;
}

interface Step {
  value: number;
  label: string;
}

/** The real funnel, as steps. A step with nothing to say is left out. */
export function trailSteps(funnel: PlanFunnel, finalists: number): Step[] {
  const steps: Step[] = [];
  if (funnel.places > 0)
    steps.push({
      value: funnel.places,
      label: funnel.places === 1 ? "opción relevante" : "opciones relevantes",
    });
  if (funnel.fitsCharacter && funnel.character)
    steps.push({
      value: funnel.fitsCharacter,
      label: `${funnel.fitsCharacter === 1 ? "encaja" : "encajan"} especialmente con «${funnel.character.toLowerCase()}»`,
    });
  if (funnel.confirmedOpenAtTime && funnel.confirmedOpenAtTime > 0)
    steps.push({
      value: funnel.confirmedOpenAtTime,
      label: "con horario confirmado",
    });
  if (funnel.withPrice && funnel.withPrice > 0)
    steps.push({
      value: funnel.withPrice,
      label: "con información económica",
    });
  if (finalists > 0)
    steps.push({
      value: finalists,
      label:
        finalists === 1
          ? "llegó a la selección final"
          : "llegaron a la selección final",
    });
  return steps;
}

/** Counts up to the real number; instantly when motion is reduced. */
function useCountUp(target: number, delay: number, reduced: boolean): number {
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let start: number | null = null;
    const duration = Math.min(900, 380 + target * 6);
    const timer = window.setTimeout(() => {
      const tick = (now: number) => {
        start ??= now;
        const progress = Math.min(1, (now - start) / duration);
        setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [target, delay, reduced]);
  return reduced ? target : value;
}

function Figure({
  step,
  index,
  reduced,
}: {
  step: Step;
  index: number;
  reduced: boolean;
}) {
  const shown = useCountUp(step.value, 260 + index * 170, reduced);
  return (
    <li className={styles.step} style={{ ["--i" as string]: index }}>
      <span className={styles.value} aria-hidden="true">
        {shown}
      </span>
      <span className="sp-sr-only">{step.value}</span>
      <span className={styles.label}>{step.label}</span>
    </li>
  );
}

/**
 * "Así llegué a este": the planner's real funnel, never an animation of
 * invented numbers. Each figure is a count the engine recorded for this
 * request, revealed in order so the narrowing reads as a decision.
 */
export function DecisionTrail({ funnel, finalists }: DecisionTrailProps) {
  const reduced = useReducedMotion();
  const steps = trailSteps(funnel, finalists);
  if (steps.length < 2) return null;
  return (
    <section className={styles.trail} aria-label="Cómo llegué a esta recomendación">
      <p className={styles.eyebrow}>Así llegué a este</p>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <Figure key={step.label} step={step} index={index} reduced={reduced} />
        ))}
      </ol>
    </section>
  );
}
