"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";

import { usePrefersReducedMotion, useIsClient } from "@/lib/motion";

import { STORY } from "./landingContent";
import { MEDIA } from "./landingMedia";
import { Reveal } from "./Reveal";
import { sceneProgress, useSceneClock } from "./sceneClock";
import {
  STORY_MOMENTS,
  STORY_WORDS,
  getStoryBeats,
  momentProgress,
  routePath,
  type StoryMoment,
  type StoryStop,
  type StoryWord,
} from "./storyScene";
import styles from "./story.module.css";

const COMPACT_QUERY = "(max-width: 900px)";

const STOP_BY_ID: Record<StoryStop, (typeof STORY.stops)[number]> =
  Object.fromEntries(STORY.stops.map((stop) => [stop.id, stop])) as Record<
    StoryStop,
    (typeof STORY.stops)[number]
  >;

/** The intention each moment grows out of. The join is by `keeps`, so the
 * word and the moment can never drift apart in the data. */
const WORD_BY_STOP: Record<StoryStop, StoryWord> = Object.fromEntries(
  STORY_WORDS.filter((word) => word.keeps).map((word) => [word.keeps, word]),
) as Record<StoryStop, StoryWord>;

const LOOSE_WORDS = STORY_WORDS.filter((word) => word.keeps === undefined);

/** matchMedia via `useSyncExternalStore` — reads the real value during
 * render, no setState in an effect. Server snapshot is `false`. */
function useCompact(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia?.(COMPACT_QUERY);
      if (!mql) return () => {};
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia?.(COMPACT_QUERY).matches === true,
    () => false,
  );
}

/**
 * The recorrido scene (CU17 · PAN 07).
 *
 * The third chapter of the landing's argument: the hero promises, the
 * gallery inspires, and this one demonstrates — eight loose intentions, of
 * which three turn into an evening that closes.
 *
 * ── Why there is no animation library here ──────────────────────────
 *
 * An earlier version drove a 3D table through a few dozen chained
 * `useTransform`s from `motion/react`, and was the only section on the page
 * that did. The hero and the inspiration gallery — the two that work — run
 * on one rAF-throttled clock that writes CSS custom properties, with every
 * beat expressed in CSS. This does the same, which removes a rendering
 * model from the page rather than adding one, and lets the whole scene
 * run without React re-rendering once.
 */
export function ImmersiveStory() {
  const reduced = usePrefersReducedMotion();
  const compact = useCompact();
  const client = useIsClient();
  // Until the client is running, render the scrubbed scene so the server and
  // first client render agree; then swap to the static layout for reduced
  // motion or narrow viewports.
  const staticMode = client && (reduced || compact);

  return (
    <section
      className={styles.section}
      data-static={staticMode ? "true" : undefined}
      aria-labelledby="story-title"
    >
      <p className="sp-sr-only">{STORY.summary}</p>
      {staticMode ? <StaticStory /> : <ScrubStory />}
    </section>
  );
}

/* ── Scroll-scrubbed scene (desktop, motion allowed) ─────────────────── */

/**
 * The scene's beats, from one rect.
 *
 * Two progress values feed `getStoryBeats`: `enter`, the section's approach,
 * and `t`, its pinned track. Both come from the single
 * `getBoundingClientRect` that `useSceneClock` takes for the frame — the
 * order is deliberate and load-bearing: **read once, compute, then write**,
 * with nothing here touching the DOM again. The clock damps every value it
 * is handed and owns the writes, so a frame costs one style recalculation
 * rather than one per property. Same discipline as
 * `InspirationGallery.tsx:measureGallery`; it has to survive every value
 * added here.
 */
function measureStory(
  rect: DOMRect,
  viewportHeight: number,
): Record<string, number> {
  const { enter, t } = sceneProgress(rect, viewportHeight);
  const beats = getStoryBeats(enter, t);

  const values: Record<string, number> = {
    "--present": beats.present,
    "--copy": beats.copy,
    "--sort": beats.sort,
    "--fade": beats.fade,
    "--warm": beats.warm,
    "--route": beats.route,
    "--payoff": beats.payoff,
  };
  for (const moment of STORY_MOMENTS) {
    values[`--plan-${moment.id}`] = momentProgress(beats.route, moment.at);
  }
  return values;
}

/**
 * The stage's size in pixels, measured once and on resize.
 *
 * The thread needs it because its path is built in real pixels rather than in
 * a stretched 0..100 viewBox — see `routePath`. This is a layout read, so it
 * lives in a ResizeObserver and never inside the rAF.
 */
function useStageBox(stage: React.RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const node = stage.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      const next = { w: Math.round(rect.width), h: Math.round(rect.height) };
      setBox((prev) => (prev.w === next.w && prev.h === next.h ? prev : next));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [stage]);

  return box;
}

/**
 * The thread's own length, published as `--route-len` so CSS can offset a
 * single dash of exactly that length — one unbroken segment, never a dash
 * pattern that can tile into fragments.
 *
 * Now that the path is authored in the stage's pixels, this length and the
 * dash array are in the same coordinate system, which is what the previous
 * version got wrong.
 */
function useRouteLength(path: React.RefObject<SVGPathElement | null>, d: string) {
  useEffect(() => {
    const node = path.current;
    if (!node || !d) return;
    // Absent in jsdom, and historically patchy on very old engines. Without
    // it the CSS fallback keeps the thread hidden rather than drawing it
    // whole, which is the safe way to be wrong here.
    if (typeof node.getTotalLength !== "function") return;

    const length = node.getTotalLength();
    if (length > 0) node.style.setProperty("--route-len", String(length));
  }, [path, d]);
}

function ScrubStory() {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  useSceneClock(track, measureStory);
  const box = useStageBox(stage);
  const d = box.w > 0 && box.h > 0 ? routePath(box.w, box.h) : "";
  useRouteLength(path, d);

  return (
    <div ref={track} className={styles.track}>
      <div className={styles.viewport}>
        <div className={styles.warm} aria-hidden="true" />

        <div ref={stage} className={styles.stage}>
          {LOOSE_WORDS.map((word) => (
            <Word key={word.label} word={word} />
          ))}

          {/* The viewBox is the stage's real pixel box, so the drawing
              surface is 1:1 with the page: no stretch, a uniform stroke
              without `non-scaling-stroke`, and a dash length that means the
              same thing as the measured path length. */}
          <svg
            className={styles.route}
            viewBox={`0 0 ${box.w || 100} ${box.h || 100}`}
            aria-hidden="true"
          >
            {d ? <path ref={path} d={d} /> : null}
          </svg>

          {STORY_MOMENTS.map((moment) => (
            <Moment key={moment.id} moment={moment} />
          ))}

          <Copy />

          <p className={styles.payoff} aria-hidden="true">
            {STORY.title[1]}
          </p>
        </div>
      </div>
    </div>
  );
}

function Copy() {
  return (
    <div className={styles.copy}>
      <p className={styles.kicker}>{STORY.kicker}</p>
      <h2 id="story-title" className={styles.title}>
        {STORY.title[0]}
      </h2>
      <p className={styles.lead}>{STORY.lead}</p>
    </div>
  );
}

/**
 * One intention that does not survive.
 *
 * Never struck through and never labelled "descartado" — a judgement drawn
 * on top of a word is a diagram's way of saying this. It simply loses ink
 * and drifts by its own vector, which is what "no cierra" actually looks
 * like.
 */
function Word({ word }: { word: StoryWord }) {
  return (
    <p
      className={styles.word}
      data-size={word.size}
      style={
        {
          "--x": `${word.home.x}%`,
          "--y": `${word.home.y}%`,
          "--rot": word.home.rot,
          // Unitless, in stage units: the CSS multiplies these by `1cqw` /
          // `1cqh`, because a percentage inside `translate3d` would resolve
          // against the word's own width instead of the composition.
          "--drift-x": word.drift?.x ?? 0,
          "--drift-y": word.drift?.y ?? 0,
        } as React.CSSProperties
      }
    >
      {word.label}
    </p>
  );
}

/**
 * One intention that survives, and the moment it turns into.
 *
 * These are the same object on purpose. The caption starts at the word's own
 * home, travels to its anchor as the sort resolves, and then grows a time
 * above it and a photograph below it — while its text settles from the
 * intention ("buena comida") into the stop's name ("Cena compartida").
 * Rendering the word and the moment as two separate elements is what made an
 * earlier version read as "here are the three resulting activities": the
 * words vanished and unrelated pictures appeared. Nothing vanishes here.
 *
 * The two texts share a single grid cell, and the scale lives on the caption
 * rather than on the word, so they share type, size, weight and left edge —
 * the change reads as one word resolving, not as a swap.
 *
 * ── Loading ─────────────────────────────────────────────────────────
 *
 * `lazy`, never `eager`. These are three large photographs two screens below
 * the hero, and the hero owns the LCP — `eager` would pull them into the
 * initial load even at `fetchPriority="low"`. Because the sticky viewport
 * enters at the section's first beat, the browser starts them roughly two
 * screens of scroll before the payoff needs them, which is ample. (The
 * gallery next door uses `eager` for the opposite reason: its photographs
 * are the first thing that beat shows.)
 */
function Moment({ moment }: { moment: StoryMoment }) {
  const stop = STOP_BY_ID[moment.id];
  const word = WORD_BY_STOP[moment.id];
  const image = MEDIA[stop.media];

  return (
    <figure
      className={styles.moment}
      style={{ "--p": `var(--plan-${moment.id}, 0)` } as React.CSSProperties}
    >
      <div
        className={styles.frame}
        style={
          {
            "--x": `${moment.frame.x}%`,
            "--y": `${moment.frame.y}%`,
            "--w": `${moment.frame.w}%`,
            "--h": `${moment.frame.h}%`,
          } as React.CSSProperties
        }
      >
        <Image
          className={styles.photo}
          src={image.src}
          alt={image.alt}
          fill
          sizes={moment.sizes}
          loading="lazy"
          decoding="async"
          style={image.focus ? { objectPosition: image.focus } : undefined}
        />
      </div>

      <figcaption
        className={styles.caption}
        style={
          {
            "--x": `${word.home.x}%`,
            "--y": `${word.home.y}%`,
            "--rot": word.home.rot,
            "--travel-x": moment.anchor.x - word.home.x,
            "--travel-y": moment.anchor.y - word.home.y,
          } as React.CSSProperties
        }
      >
        <time className={styles.time} dateTime={stop.time}>
          {stop.time}
        </time>
        <span className={styles.name}>
          <span className={styles.intention} aria-hidden="true">
            {word.label}
          </span>
          <span className={styles.resolved}>{stop.label}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/* ── Static composition (mobile / reduced motion) ────────────────────── */

/**
 * The same argument without a scroll clock, and on the same cream.
 *
 * The sort is stated rather than performed — the three that matter are
 * already large and dark, the rest already small and quiet — and each moment
 * is simply its time, its name and its photograph in normal flow. Nothing is
 * pinned and nothing changes colour.
 */
function StaticStory() {
  return (
    <div className={styles.staticScene}>
      <div className={styles.staticCopy}>
        <Copy />
      </div>

      <ul className={styles.staticWords} aria-hidden="true">
        {STORY_WORDS.map((word) => (
          <li key={word.label} data-keeps={word.keeps ? "true" : "false"}>
            {word.label}
          </li>
        ))}
      </ul>

      <ol className={styles.staticMoments}>
        {STORY_MOMENTS.map((moment, index) => {
          const stop = STOP_BY_ID[moment.id];
          const image = MEDIA[stop.media];
          return (
            <li key={moment.id}>
              <Reveal delay={index * 70}>
                <figure className={styles.staticMoment}>
                  <figcaption className={styles.caption}>
                    <time className={styles.time} dateTime={stop.time}>
                      {stop.time}
                    </time>
                    <span className={styles.name}>
                      <span className={styles.resolved}>{stop.label}</span>
                    </span>
                  </figcaption>
                  <div className={styles.frame}>
                    <Image
                      className={styles.photo}
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 900px) 92vw, 40vw"
                      loading="lazy"
                      decoding="async"
                      style={image.focus ? { objectPosition: image.focus } : undefined}
                    />
                  </div>
                </figure>
              </Reveal>
            </li>
          );
        })}
      </ol>

      <p className={styles.payoff}>{STORY.title[1]}</p>
    </div>
  );
}
