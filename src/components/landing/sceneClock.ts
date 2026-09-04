"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * The one clock every scroll-scrubbed section on the landing runs on.
 *
 * ── Why the beats are damped ─────────────────────────────────────────
 *
 * A beat bound rigidly to `scrollY` inherits the shape of the input
 * device. A trackpad supplies a continuous gesture and looks fine; a
 * mouse wheel on Windows arrives as discrete ~100px notches, and a scene
 * scrubbed straight off that jumps in the same notches — five or six
 * steps per screen, every element on the stage stepping together. That
 * stepping is what reads as "tosco", and no amount of easing *inside*
 * the beat curves can smooth it, because the curve is being sampled at
 * six points, not because the curve is wrong.
 *
 * So the target is still read straight from the geometry every frame,
 * and what is written is a value that chases it: an exponential follow
 * with a time constant of `TAU` seconds. Between two wheel notches the
 * scene keeps moving toward where the scroll already is, which turns a
 * staircase into a ramp.
 *
 * `TAU` is deliberately small. `motion.css` warns that an eased scrub
 * "feels like it is lagging the finger", and that is the real risk here:
 * at 70ms the follow is under five frames behind a continuous gesture —
 * below the threshold where a pinned scene reads as detached from the
 * scroll — while still being long enough to bridge a wheel notch.
 *
 * ── What it does not change ─────────────────────────────────────────
 *
 * The read-once-then-write discipline the scenes were built on is
 * intact: one `getBoundingClientRect` per frame, all computation off
 * that single read, and every DOM write after it. Damping adds no reads.
 */

/** Seconds for the follow to close ~63% of the remaining distance. */
const TAU = 0.07;

/**
 * The step used for the first frame after the loop has been idle.
 *
 * The loop stops once a beat has arrived, so between two wheel notches no
 * frames run at all. Measuring the wall-clock gap on the frame that
 * restarts it would charge the follow for time in which nothing was
 * moving — and since a notch's target lands all at once, that single
 * frame would swallow most of the jump, which is the staircase again.
 * The target only moved on this frame, so the follow advances by one.
 */
const NOMINAL_FRAME = 1 / 60;

/** A dropped frame must not turn into one long stride. */
const MAX_FRAME = 1 / 30;

/**
 * Below this the follow has arrived: the value is snapped to the target
 * and the loop stops. Beats drive opacity and sub-pixel transforms, so
 * a thousandth is already past what the compositor can show.
 */
const EPSILON = 0.0005;

/**
 * Measures the section against the viewport and returns the beats to
 * publish, keyed by the CSS custom property that carries each one.
 *
 * It receives the single rect read for this frame — never read the DOM
 * again inside it.
 */
export type MeasureScene = (
  rect: DOMRect,
  viewportHeight: number,
) => Record<string, number>;

export interface SceneClockOptions {
  /**
   * Whether the clock runs at all. A section that is not on stage —
   * the hero once a generation has started, say — passes `false` and
   * the listeners are never attached.
   */
  active?: boolean;
  /**
   * The element whose rect describes the beat, when that is not the
   * element the properties are written on. Resolved once, on the frame
   * the effect runs, so it costs no DOM query per frame.
   *
   * `IntroSequence` needs this: it writes onto a wrapper with no height
   * of its own — the properties have to be inherited by the hero *and*
   * the section below it — while the beat is the hero's own travel.
   */
  target?: (node: HTMLElement) => HTMLElement | null;
}

/**
 * Drives `node`'s scroll-linked custom properties from one rAF loop.
 *
 * The properties are written on the element `ref` points at, which is
 * also the element measured, so a scene's track is both the ruler and
 * the place its beats live.
 */
export function useSceneClock(
  ref: RefObject<HTMLElement | null>,
  measure: MeasureScene,
  { active = true, target }: SceneClockOptions = {},
): void {
  // Held in a ref so a new closure on every render does not tear the
  // loop down and rebuild it; the effect below depends on `active`
  // alone.
  const measureRef = useRef(measure);
  useEffect(() => {
    measureRef.current = measure;
  }, [measure]);

  useEffect(() => {
    if (!ref.current || !active) return;
    // Bound to a non-nullable local: the writes happen inside a callback,
    // and a narrowed `ref.current` does not survive into one.
    const node: HTMLElement = ref.current;

    // Resolved once: a query per frame would be a DOM read in the middle
    // of the write phase, which is the thing these scenes are built to
    // avoid.
    const resolved = target ? target(node) : node;
    if (!resolved) return;
    const measured: HTMLElement = resolved;

    const reduced =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    let frame = 0;
    let disposed = false;
    let viewportHeight = window.innerHeight;
    let last = 0;
    /** The damped values actually on the DOM, by property name. */
    const current = new Map<string, number>();
    /** The first write lands on the target: a page restored mid-scroll
     *  must not animate its way in from wherever the beats started. */
    let settled = false;
    /** No frames are running — the beats are all at their targets. */
    let idle = true;

    function write(now: number) {
      frame = 0;
      // A frame requested before the effect was torn down can still be
      // delivered after it; in a test environment that means writing into
      // a document that is on its way out.
      if (disposed) return;

      // ── read (once) ──
      const rect = measured.getBoundingClientRect();

      // ── compute ──
      const beats = measureRef.current(rect, viewportHeight);
      // One frame's worth of follow, never the wall-clock gap since the
      // page last moved: see `NOMINAL_FRAME`. Clamped at both ends — a
      // negative timestamp difference would push the beat away from its
      // target, a dropped frame would lurch it forward.
      const elapsed = Math.min(Math.max((now - last) / 1000, 0), MAX_FRAME);
      const delta = idle ? NOMINAL_FRAME : elapsed;
      idle = false;
      last = now;
      // Only the very first write lands on the target outright: the page
      // may be restored halfway down, and animating in from beat zero
      // would replay the whole scene at load.
      const snap = !settled || reduced?.matches === true;
      const follow = snap ? 1 : 1 - Math.exp(-delta / TAU);

      let moving = false;

      // ── write ──
      for (const [key, to] of Object.entries(beats)) {
        const from = current.get(key) ?? to;
        const next = Math.abs(to - from) < EPSILON ? to : from + (to - from) * follow;
        current.set(key, next);
        if (next !== to) moving = true;
        node.style.setProperty(key, next.toFixed(3));
      }

      settled = true;
      // Keep the loop alive while the follow is still closing, so the
      // scene continues to move after the wheel notch has landed.
      if (moving) frame = requestAnimationFrame(write);
      else idle = true;
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(write);
    }

    function onResize() {
      viewportHeight = window.innerHeight;
      schedule();
    }

    // Synchronously, not through the scheduler: the beats have to be on
    // the DOM before the first paint, or the scene shows its default
    // values for a frame. It also leaves no frame pending on mount.
    write(performance.now());
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    reduced?.addEventListener("change", schedule);

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      reduced?.removeEventListener("change", schedule);
    };
  }, [ref, active, target]);
}

/**
 * Shared by every scene's `measure`.
 *
 * Written to fold `-0` into `0`: a scene sitting exactly at a boundary
 * produces one, and while `(-0).toFixed(3)` paints the same as zero, it
 * compares as a different value — a trap for anything downstream that
 * reasons about a beat rather than printing it.
 */
export const clamp01 = (value: number): number =>
  value > 0 ? (value > 1 ? 1 : value) : 0;

/**
 * The two clocks a pinned section runs on, from one rect.
 *
 * `enter` is the approach — 0 with the section's top edge at the bottom
 * of the viewport, 1 when it reaches the top — and is what lets a scene
 * start arriving while the one above it is still leaving. `t` is the
 * pinned track: how far through the height beyond one viewport the
 * visitor has scrolled while the sticky child is held still.
 */
export function sceneProgress(
  rect: DOMRect,
  viewportHeight: number,
): { enter: number; t: number } {
  return {
    enter: clamp01(1 - rect.top / Math.max(viewportHeight, 1)),
    t: clamp01(-rect.top / Math.max(rect.height - viewportHeight, 1)),
  };
}
