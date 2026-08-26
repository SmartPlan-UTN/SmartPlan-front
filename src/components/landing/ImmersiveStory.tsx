"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion, useScrollProgress } from "@/hooks";

import { INTENT_NODES, STORY } from "./landingContent";
import { createScene, drawScene, type Scene } from "./storyScene";
import styles from "./story.module.css";

/** Colour channels, not finished colours: alpha is applied per draw. */
const THEME = {
  ember: "232, 93, 32",
  gold: "255, 209, 102",
  electric: "43, 91, 255",
  ink: "245, 240, 232",
} as const;

const DESKTOP_NODES = 24;
const MOBILE_NODES = 13;
/** How long the unpinned version takes to play itself, in seconds. */
const AUTOPLAY_SECONDS = 3.2;

/**
 * The page's one big visual moment.
 *
 * On a wide screen the section is three viewports tall with its contents
 * pinned, so scrolling scrubs the animation rather than moving past it —
 * the visitor is doing the crossing, at their own speed, in both
 * directions.
 *
 * That is the wrong interaction on a phone, where hijacking three
 * viewports of scroll to hold one image still is the most annoying thing
 * a landing page does. So the small-screen build is not a cut-down pin:
 * it is a normal-height section that plays itself once when it arrives.
 * Same scene, same argument, different delivery.
 *
 * Under `prefers-reduced-motion` the canvas paints the resolved final
 * frame and never animates. The section still says what it says: the
 * three phases and the three stops are real text underneath it, not
 * captions on a picture.
 */
export function ImmersiveStory() {
  const { ref: sectionRef, progress } = useScrollProgress<HTMLElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [pinned, setPinned] = useState(true);

  // The loop reads scroll progress from a ref so it never re-subscribes:
  // rebuilding the scene on every scroll frame would restart the drift.
  const progressRef = useRef(0);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    setPinned(media.matches);

    function onChange(event: MediaQueryListEvent) {
      setPinned(event.matches);
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let scene: Scene | null = null;
    let width = 0;
    let height = 0;
    let frame: number | null = null;
    let visible = true;
    let started: number | null = null;

    // Inherits Bricolage from the page rather than hard-coding a stack:
    // canvas text in a different typeface than the copy beside it is
    // immediately obvious.
    const font =
      getComputedStyle(canvas).fontFamily || "system-ui, sans-serif";
    const theme = { ...THEME, font };

    function measure() {
      if (!canvas || !context) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const compact = width < 700;
      scene ??= createScene(INTENT_NODES, {
        count: compact ? MOBILE_NODES : DESKTOP_NODES,
        compact,
      });
    }

    function paint(now: number) {
      if (!context || !scene || width === 0) return;

      started ??= now;
      const elapsed = (now - started) / 1000;

      // Two ways to be at a point in the story: scrubbed by scroll when
      // pinned, or played once on arrival when not.
      const value = reduced
        ? 1
        : pinned
          ? progressRef.current
          : Math.min(elapsed / AUTOPLAY_SECONDS, 1);

      drawScene(context, scene, {
        progress: value,
        time: elapsed,
        width,
        height,
        theme,
        stopLabels: STORY.stops,
      });
    }

    function loop(now: number) {
      paint(now);
      frame = requestAnimationFrame(loop);
    }

    measure();

    if (reduced) {
      // One frame, at the end of the story. No loop at all.
      paint(performance.now());
    } else {
      frame = requestAnimationFrame(loop);
    }

    // Off-screen frames are wasted frames, and this is the most
    // expensive thing on the page.
    const section = sectionRef.current;
    const gate =
      section && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              const next = entry?.isIntersecting ?? true;
              if (next === visible) return;
              visible = next;

              if (!visible && frame != null) {
                cancelAnimationFrame(frame);
                frame = null;
                return;
              }
              if (visible && frame == null && !reduced) {
                frame = requestAnimationFrame(loop);
              }
            },
            { rootMargin: "120px" },
          )
        : null;

    if (section) gate?.observe(section);

    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            measure();
            if (reduced) paint(performance.now());
          });
    resize?.observe(canvas);

    return () => {
      if (frame != null) cancelAnimationFrame(frame);
      gate?.disconnect();
      resize?.disconnect();
    };
  }, [reduced, pinned, sectionRef]);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      data-pinned={pinned && !reduced ? "true" : undefined}
      aria-labelledby="story-title"
    >
      <div className={styles.viewport}>
        <div className={styles.overlay}>
          {/* The scene's own box. On a wide screen it is the whole
              viewport and the copy sits over it; on a phone it is a band
              between the copy and the phases, so the route can never
              collide with either. */}
          <div className={styles.stage}>
            <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          </div>

          <div className={styles.copy}>
            <p className={`sp-label ${styles.kicker}`}>{STORY.kicker}</p>
            <h2 id="story-title" className={styles.title}>
              {STORY.title[0]}
              <span className={styles.titleAccent}> {STORY.title[1]}</span>
            </h2>
            <p className={styles.lead}>{STORY.lead}</p>
          </div>

          {/* The canvas is decorative, so what it depicts is stated here
              in text — legible to a screen reader, to a printed page, and
              to anyone who simply scrolled past it too fast. */}
          <ol className={styles.phases}>
            {STORY.phases.map((phase, index) => (
              <li key={phase.at} className={styles.phase} data-index={index}>
                <span className={styles.phaseDot} aria-hidden="true" />
                <span className={styles.phaseAt}>{phase.at}</span>
                <span className={styles.phaseCopy}>{phase.copy}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
