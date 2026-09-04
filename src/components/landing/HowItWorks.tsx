"use client";

import {
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import Image from "next/image";

import { Icon } from "@/components/ui";
import { useIsClient, usePrefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

import composer from "@/components/home/composer.module.css";

import { HOW, SHOWCASE } from "./landingContent";
import { MEDIA, type MediaKey } from "./landingMedia";
import { Reveal } from "./Reveal";
import {
  HOW_OPTION_SLOTS,
  activeStep,
  getHowBeats,
  optionProgress,
} from "./howScene";
import { sceneProgress, useSceneClock } from "./sceneClock";
import styles from "./how.module.css";

const COMPACT_QUERY = "(max-width: 900px)";

/** What the scene needs from an option — the shared shape of a scene-only
 * `HowOption` and a full `ShowcasePlan`. */
interface OptionData {
  id: string;
  title: string;
  duration: string;
  budget: 1 | 2 | 3;
  tone: "ember" | "char" | "gold" | "electric" | "cream";
  media: MediaKey;
}

/** The plan the scene ends on is a real showcase entry, so the alternative
 * the visitor watches win is the same object that then leads "Así se ve una
 * respuesta". The two that lose are scene-only. */
const CHOSEN: OptionData =
  SHOWCASE.plans.find((plan) => plan.id === HOW.chosenId) ?? SHOWCASE.plans[0];

/** Filled into the three slots: loser, winner, loser. */
const OPTIONS: OptionData[] = [HOW.options[0], CHOSEN, HOW.options[1]];

/** matchMedia via `useSyncExternalStore` — reads the real value during
 * render, `false` on the server, no setState in an effect. Same shape as the
 * story and gallery scenes. */
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
 * The fourth section (CU17 · PAN 07): how little you have to do.
 *
 * The three scenes before it build the argument; the story next door is the
 * page's art piece and shows what smartplan *does* to an idea. This one has
 * the opposite job — it shows how *easy* that is — so it is the page's
 * product piece: cleaner, quicker, and every movement stating a fact rather
 * than performing one.
 *
 * One pinned scene that transforms four times: a phrase is written into a
 * faithful replica of the real composer, smartplan reads it (three context
 * annotations rise out of the words and retract), three recorridos arrive,
 * one comes forward. That one is `SHOWCASE.plans[0]` — it grows toward the
 * featured card that "Así se ve una respuesta" opens with, so the section
 * that follows is visibly the same plan continuing rather than a new block.
 *
 * ── Why there is no animation library here ──────────────────────────
 *
 * The previous version drove its progress line with `motion/react`'s
 * `useScroll` / `useMotionValueEvent`. The story and the gallery — the two
 * scenes that work — run on one rAF-throttled clock that writes CSS custom
 * properties, with every beat expressed in CSS. This now does the same,
 * which removes a rendering model from the page rather than adding one.
 *
 * ── For a signed-in visitor ─────────────────────────────────────────
 *
 * "Así se ve una respuesta" is replaced by their real recommendations, so
 * the featured-card hand-off does not land. The scene still resolves on
 * cream with the chosen recorrido centred, and `RecommendedPlans` follows in
 * normal flow. Accepted asymmetry.
 */
export function HowItWorks() {
  const reduced = usePrefersReducedMotion();
  const compact = useCompact();
  const client = useIsClient();
  const staticMode = client && (reduced || compact);

  return (
    <section
      className={styles.section}
      data-static={staticMode ? "true" : undefined}
      aria-labelledby="how-title"
    >
      <p className="sp-sr-only">{HOW.summary}</p>
      {staticMode ? <StaticHow /> : <ScrubHow />}
    </section>
  );
}

/* ── Scroll-scrubbed scene (desktop, motion allowed) ─────────────────── */

/**
 * The scene's beats, from one rect.
 *
 * `useSceneClock` takes the single `getBoundingClientRect` for the frame and
 * owns every write; this does the arithmetic in between and touches no DOM.
 * Reading after a write forces synchronous layout, so it never happens. Same
 * discipline as `ImmersiveStory.tsx:measureStory`.
 *
 * The step marker is the one thing kept in React, and `onStep` is the reason
 * this takes a callback: four thresholds, reported only when the step
 * actually changes, so the scene re-renders exactly three times across the
 * whole scroll rather than once a frame.
 */
function measureHow(
  rect: DOMRect,
  viewportHeight: number,
  onStep: (step: 0 | 1 | 2 | 3) => void,
): Record<string, number> {
  const { enter, t } = sceneProgress(rect, viewportHeight);
  const beats = getHowBeats(enter, t);

  const values: Record<string, number> = {
    "--headline": beats.headline,
    "--emphasis": beats.emphasis,
    "--type": beats.type,
    "--shrink": beats.shrink,
    "--options": beats.options,
    "--choose": beats.choose,
    "--expand": beats.expand,
  };
  HOW_OPTION_SLOTS.forEach((slot, index) => {
    values[`--opt-${index}`] = optionProgress(beats.options, slot.delay);
  });

  onStep(activeStep(t));
  return values;
}

function ScrubHow() {
  const track = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const lastStep = useRef<number>(-1);
  const measure = useCallback((rect: DOMRect, viewportHeight: number) => {
    return measureHow(rect, viewportHeight, (next) => {
      if (next === lastStep.current) return;
      lastStep.current = next;
      setStep(next);
    });
  }, []);
  useSceneClock(track, measure);

  return (
    <div ref={track} className={styles.track}>
      <div className={styles.viewport}>
        <div className={styles.stage}>
          <Headline />
          <FauxComposer />

          {OPTIONS.map((option, index) => (
            <Option
              key={option.id}
              option={option}
              slot={index}
              chosen={HOW_OPTION_SLOTS[index].chosen === true}
            />
          ))}

          <p className={styles.marker} aria-hidden="true">
            <span className={styles.markerNum}>{HOW.steps[step].n}</span>
            <span key={step} className={styles.markerLabel}>
              {HOW.steps[step].label}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Both halves of the headline. The first is the darkest type in the scene;
 * the second starts quiet (`--fg-3`) and gains ink as the track advances —
 * the claim getting more certain as the scene proves it. It lands in the
 * left column, where the story's "El plan sí." just was. */
function Headline() {
  return (
    <div className={styles.headline}>
      <h2 id="how-title" className={styles.title}>
        {HOW.title[0]}
        <span className={styles.titleSoft}>{HOW.title[1]}</span>
      </h2>
    </div>
  );
}

/**
 * A faithful, inert replica of the real `PlanComposer` — the structural
 * classes come straight from `composer.module.css` so it cannot drift from
 * the real control, and only a few scene-specific rules are added here. It
 * is `aria-hidden`: the `<h2>`, the step marker and the option titles carry
 * the meaning for assistive tech, and the `sp-sr-only` summary states the
 * whole sequence.
 *
 * The phrase reveals with `--type` (a width clip) rather than a real
 * per-character loop: it keeps the effect on the compositor and "typing" is
 * a texture here, not the point.
 */
function FauxComposer() {
  // Only the inner structural classes are borrowed from `composer.module.css`
  // (`glow`, `field`, `fieldIcon`, `inputArea`, `submit`). The outer wrapper is
  // this scene's own — reusing `composer.composer` too would put a
  // cross-file specificity tie between `position: relative` and the
  // `position: absolute` this needs.
  return (
    <div className={styles.composer} aria-hidden="true">
      <div className={composer.glow} />
      <div className={cn(composer.field, styles.field)}>
        <span className={composer.fieldIcon}>
          <Icon name="search" size={17} stroke={1.9} />
        </span>
        <div className={composer.inputArea}>
          <p className={styles.phrase}>
            <span className={styles.phraseText}>{HOW.phrase}</span>
            <span className={styles.caret} aria-hidden="true" />
          </p>
        </div>
        <span className={cn(composer.submit, styles.submit)}>
          <span className={composer.submitLabel}>Planificar</span>
          <Icon name="arrow-right" size={15} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

/* The three context annotations that used to rise around the composer are
 * gone from this scene. They were absolutely positioned against the field's
 * edges, and at the composer's real width they sat on top of its border and
 * its own typed phrase rather than beside them — three orange labels
 * crossing the one element the beat is about. The static composition below
 * still states them, as chips in normal flow, where nothing can collide. */

/** The card itself — one visual, used pinned in the scene and in normal flow
 * in the static layout. Photo over a toned wash, short title, duration and a
 * three-glyph budget meter. No moment list or tags here: those belong to the
 * featured card in "Así se ve una respuesta", and this scene stays spare. */
function OptionCard({ option }: { option: OptionData }) {
  const image = MEDIA[option.media];
  return (
    <>
      <div className={styles.optionMedia}>
        <div className={styles.optionField} aria-hidden="true" />
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 900px) 92vw, 40vw"
          className={styles.optionPhoto}
          loading="lazy"
          style={image.focus ? { objectPosition: image.focus } : undefined}
        />
      </div>
      <div className={styles.optionBody}>
        <h3 className={styles.optionTitle}>{option.title}</h3>
        <p className={styles.optionMeta}>
          <span className={styles.optionMetaItem}>
            <Icon name="clock" size={13} stroke={2} aria-hidden="true" />
            {option.duration}
          </span>
          <span className={styles.optionDot} aria-hidden="true" />
          <span className={styles.budget} aria-hidden="true">
            {[1, 2, 3].map((level) => (
              <span
                key={level}
                className={styles.budgetMark}
                data-on={level <= option.budget ? "true" : undefined}
              >
                $
              </span>
            ))}
          </span>
          <span className="sp-sr-only">Nivel de gasto {option.budget} de 3</span>
        </p>
      </div>
    </>
  );
}

/** One option, placed at its slot's final frame and moved only by transform.
 * `--p` is its arrival progress; `--choose` and `--expand` (on `.track`)
 * decide whether it steps aside or grows into the featured card. */
function Option({
  option,
  slot,
  chosen,
}: {
  option: OptionData;
  slot: number;
  chosen: boolean;
}) {
  const { frame, from } = HOW_OPTION_SLOTS[slot];

  const vars = {
    "--x": `${frame.x}%`,
    "--y": `${frame.y}%`,
    "--w": `${frame.w}%`,
    "--h": `${frame.h}%`,
    "--from-x": `${from.x}`,
    "--from-y": `${from.y}`,
    "--p": `var(--opt-${slot}, 0)`,
  } as CSSProperties;

  return (
    <article
      className={styles.option}
      data-chosen={chosen ? "true" : undefined}
      data-tone={option.tone}
      style={vars}
    >
      <OptionCard option={option} />
    </article>
  );
}

/* ── Static composition (mobile / reduced motion) ────────────────────── */

/**
 * The same four beats without a clock. The phrase is already written, the
 * signals are stated as three quiet chips, the three recorridos are in
 * normal flow with the chosen one already marked, and the sentence
 * continues into "Así se ve una respuesta" below. Nothing is pinned.
 */
function StaticHow() {
  return (
    <div className={styles.staticScene}>
      <div className={styles.staticHead}>
        <Headline />
        <ol className={styles.staticSteps}>
          {HOW.steps.map((step) => (
            <li key={step.n}>
              <span className={styles.markerNum}>{step.n}</span>
              {step.label}
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.staticComposer}>
        <FauxComposer />
        <ul className={styles.staticSignals} aria-hidden="true">
          {HOW.signals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </div>

      <ol className={styles.staticOptions}>
        {OPTIONS.map((option, index) => (
          <li
            key={option.id}
            className={cn(
              styles.optionItem,
              HOW_OPTION_SLOTS[index].chosen ? styles.chosenItem : undefined,
            )}
          >
            <Reveal delay={index * 70}>
              <article
                className={styles.staticOption}
                data-tone={option.tone}
                data-chosen={
                  HOW_OPTION_SLOTS[index].chosen ? "true" : undefined
                }
              >
                <OptionCard option={option} />
              </article>
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
