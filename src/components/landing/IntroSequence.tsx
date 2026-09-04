"use client";

import { useRef, type ReactNode } from "react";

import { useSceneClock } from "./sceneClock";
import styles from "./landing.module.css";

interface IntroSequenceProps {
  active: boolean;
  children: ReactNode;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The hero's own exit over one 0..1 clock: the headline clears first, and
 * the floating objects drift off slowly across most of the scroll.
 *
 * The section below used to hang off this clock too, on windows that
 * opened long after the headline was gone — which is what produced the
 * dead screen between them. It now runs its own approach clock and starts
 * moving while the hero is still on screen, so the hand-off is continuous
 * and nothing here needs to know about it. Note that the 1.75 is only a
 * divisor: this component renders a plain relatively-positioned
 * wrapper with no height of its own, so no part of that range is
 * reserved space.
 */
export function getIntroPhases(progress: number) {
  const raw = clamp01(progress);
  const phase = (start: number, end: number) =>
    clamp01((raw - start) / (end - start));

  return {
    raw,
    hero: phase(0.05, 0.3),
    objects: phase(0.02, 0.52),
  };
}

const findHero = (node: HTMLElement) =>
  node.querySelector<HTMLElement>("[data-intro-hero]");

/**
 * The hero's beats, from its own rect.
 *
 * Reduced motion pins every beat at zero rather than merely undamping
 * them: the hero's CSS neutralises the exit as well, and this keeps the
 * two from disagreeing if one of them is ever edited alone.
 */
function measureIntro(rect: DOMRect): Record<string, number> {
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return {
      "--intro-progress": 0,
      "--hero-stage-progress": 0,
      "--object-exit-progress": 0,
    };
  }

  // Measured over more than the hero's own height so the beats have room
  // to breathe instead of firing off in the first screen of scroll.
  // Untouched: this curve is the hero's feel.
  const phases = getIntroPhases(-rect.top / Math.max(rect.height * 1.75, 1));

  return {
    "--intro-progress": phases.raw,
    "--hero-stage-progress": phases.hero,
    "--object-exit-progress": phases.objects,
  };
}

/**
 * One damped rAF scroll clock, driving the hero exit.
 *
 * The hero is measured rather than the wrapper: this component renders a
 * plain relatively-positioned div with no height of its own, so its own
 * rect would not describe the beat. `useSceneClock` writes onto the
 * wrapper all the same, because that is the element the hero's CSS
 * inherits the properties from.
 */
export function IntroSequence({ active, children }: IntroSequenceProps) {
  const root = useRef<HTMLDivElement>(null);

  useSceneClock(root, measureIntro, { active, target: findHero });

  return (
    <div
      ref={root}
      className={styles.introSequence}
      data-active={active ? "true" : undefined}
    >
      {children}
    </div>
  );
}
