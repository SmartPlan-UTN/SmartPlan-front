"use client";

import { useEffect, useRef, type ReactNode } from "react";

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

/** One rAF-throttled scroll clock, driving the hero exit. */
export function IntroSequence({ active, children }: IntroSequenceProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node || !active || typeof window.matchMedia !== "function") return;
    const sequence = node;

    const hero = sequence.querySelector<HTMLElement>("[data-intro-hero]");
    if (!hero) return;
    const heroNode = hero;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    function update() {
      frame = 0;
      if (reduced.matches) {
        sequence.style.setProperty("--intro-progress", "0");
        sequence.style.setProperty("--hero-stage-progress", "0");
        sequence.style.setProperty("--object-exit-progress", "0");
        return;
      }

      const rect = heroNode.getBoundingClientRect();
      // Measured over more than the hero's own height so the beats have
      // room to breathe instead of firing off in the first screen of
      // scroll. Untouched: this curve is the hero's feel.
      const phases = getIntroPhases(
        -rect.top / Math.max(rect.height * 1.75, 1),
      );

      sequence.style.setProperty("--intro-progress", phases.raw.toFixed(3));
      sequence.style.setProperty("--hero-stage-progress", phases.hero.toFixed(3));
      sequence.style.setProperty("--object-exit-progress", phases.objects.toFixed(3));
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
    };
  }, [active]);

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
