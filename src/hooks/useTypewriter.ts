"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "./useReducedMotion";

/** Base delay between two typed characters, before jitter. */
const TYPE_MS = 46;
/** Deleting reads as a single gesture, so it runs faster than typing. */
const DELETE_MS = 22;
/** How long a finished phrase stays on screen before it is erased. */
const HOLD_MS = 2400;
/** Silence between one phrase being erased and the next one starting. */
const GAP_MS = 520;

/**
 * Human typing is not metronomic. A flat interval is what makes a
 * typewriter effect read as "a machine is animating text at you"; a small
 * random spread plus a breath after punctuation is what makes it read as
 * someone thinking while they write.
 */
function delayAfter(character: string | undefined): number {
  const jittered = TYPE_MS * (0.7 + Math.random() * 0.7);
  if (character === "," || character === ".") return jittered + 220;
  if (character === " ") return jittered + 24;
  return jittered;
}

export interface UseTypewriterResult {
  /** The fragment to render right now. */
  text: string;
  /** `false` when the text is static: reduced motion, or no phrases. */
  animating: boolean;
}

/**
 * Types a list of phrases one after another, character by character, then
 * erases each one and moves to the next.
 *
 * Built for the composer's animated placeholder, where the phrases double
 * as the explanation of what a person can write. Two consequences of that:
 *
 * - It is decorative. The element that renders `text` must be
 *   `aria-hidden`, and the real `placeholder` attribute must still carry a
 *   static hint, so assistive technology and a no-JS render never depend
 *   on this.
 * - It stops under `prefers-reduced-motion: reduce`, where it returns the
 *   first phrase whole instead of animating it.
 *
 * `active` pauses the animation without unmounting it — the composer turns
 * it off while the field is focused or holds text, so the animation never
 * runs underneath someone who is actually typing. Re-activating restarts
 * from the next phrase rather than resuming mid-word.
 *
 * Both `animating` and the reduced-motion text are *derived* rather than
 * stored. They are pure functions of the inputs, and computing them during
 * render instead of writing them from an effect is what keeps this hook
 * from re-rendering its consumer an extra time on every mount and on every
 * focus change.
 *
 * @param phrases Stable array of phrases. Declare it at module scope: a new
 *   array on every render would restart the animation on every render.
 * @param active Whether the animation should be running.
 */
export function useTypewriter(
  phrases: readonly string[],
  active = true,
): UseTypewriterResult {
  const [typed, setTyped] = useState("");
  const reduced = useReducedMotion();
  // Survives the pause/resume cycle so re-focusing the composer shows the
  // next example rather than replaying the one that was already on screen.
  const phraseIndex = useRef(0);

  const running = !reduced && active && phrases.length > 0;

  useEffect(() => {
    if (!running) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let characters = 0;
    let deleting = false;

    function schedule(ms: number) {
      timer = setTimeout(() => {
        if (!cancelled) step();
      }, ms);
    }

    function step() {
      const phrase = phrases[phraseIndex.current % phrases.length];

      if (!deleting) {
        characters += 1;
        setTyped(phrase.slice(0, characters));

        if (characters >= phrase.length) {
          deleting = true;
          schedule(HOLD_MS);
          return;
        }

        schedule(delayAfter(phrase[characters - 1]));
        return;
      }

      characters -= 1;
      setTyped(phrase.slice(0, characters));

      if (characters <= 0) {
        deleting = false;
        phraseIndex.current += 1;
        schedule(GAP_MS);
        return;
      }

      schedule(DELETE_MS);
    }

    // Cleared on the next tick rather than synchronously: a setState in an
    // effect body costs an immediate second render, and one frame of the
    // previous fragment on re-activation is not perceptible.
    timer = setTimeout(() => {
      if (cancelled) return;
      setTyped("");
      schedule(GAP_MS);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phrases, running]);

  return {
    text: reduced ? (phrases[0] ?? "") : typed,
    animating: running,
  };
}
