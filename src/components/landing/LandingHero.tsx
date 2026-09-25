"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";

import {
  GenerationState,
  PlanComposer,
  PlanResults,
  PreferencesHint,
  SurpriseButton,
  type PlanComposerHandle,
  type SurpriseCoords,
  type SurpriseResolvedMeta,
} from "@/components/home";
import { useReducedMotion, type UsePlanRequestPollingResult } from "@/hooks";
import { EASE_OUT } from "@/lib/motion";
import type { PlanRequestContext } from "@/types";

/**
 * How long `GenerationState` keeps showing its `generated` completion beat
 * (progress rail snapping to 100%) before this component swaps in
 * `PlanResults`. Presentation-only sequencing — `usePlanRequestPolling`'s
 * own phase never has a "holding" concept.
 */
const HANDOFF_HOLD_MS = 340;

import { HeroAmbient } from "./HeroAmbient";
import { HeroObjects } from "./HeroObjects";
import { IntentChips } from "./IntentChips";
import { HERO } from "./landingContent";
import styles from "./hero.module.css";

/**
 * Purely decorative and canvas-heavy — never wanted server-side, and it
 * carries its own `requestAnimationFrame` loop, so it splits out of the
 * initial bundle and loads only once the hero is on screen.
 */
const HeroAtmosphere = dynamic(
  () => import("./HeroAtmosphere").then((m) => m.HeroAtmosphere),
  { ssr: false },
);

export interface LandingHeroProps {
  /** Lifted into the page so the closing field drives the same state. */
  planning: UsePlanRequestPollingResult;
  sessionLoading: boolean;
  onSubmit: (query: string, context: PlanRequestContext) => void;
  onSurprise: (
    coords: SurpriseCoords | null,
    meta: SurpriseResolvedMeta,
  ) => void;
  /** Creates a fresh surprise request from the same coordinates (CU19). */
  onRegenerate: () => void;
  /** One-line note under the surprise waiting / results copy (CU19). */
  surpriseNote?: string | null;
  /** Returns to the composer carrying the previous idea. */
  onAdjust: () => void;
  /**
   * An idea to drop into the composer once it is back on screen — how
   * "ajustar" returns someone's own words to them instead of an empty
   * field. Consumed once, then cleared by `onPrefillConsumed`.
   */
  prefill?: string | null;
  onPrefillConsumed?: () => void;
}

export const HERO_COMPOSER_ID = "plan-composer";

/**
 * The landing's first screen.
 *
 * One centred column with the composer at its optical centre. Everything
 * above the field is short enough to read in a single pass and everything
 * below it is one row tall, because the field is the only thing on this
 * screen a visitor has to find.
 *
 * Generation and results replace that column in place rather than routing
 * away, so "I wrote an idea" and "here are the plans" are visibly the same
 * screen answering.
 *
 * Background layers, back to front: `HeroAmbient`'s faint marks,
 * `HeroObjects`' photographs, `HeroAtmosphere` for air, and a paper-light
 * veil that lifts the cream back up under the field so none of them ever
 * costs the composer contrast. The landing has no wave canvas —
 * `AppBackground` skips this route.
 */
export function LandingHero({
  planning,
  sessionLoading,
  onSubmit,
  onSurprise,
  onRegenerate,
  surpriseNote,
  onAdjust,
  prefill,
  onPrefillConsumed,
}: LandingHeroProps) {
  const [writing, setWriting] = useState(false);
  const composer = useRef<PlanComposerHandle>(null);
  const hero = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const {
    phase,
    plans,
    resolvedContext,
    failure,
    query,
    requestedAt,
    progressStage,
    progressStageAt,
    estimatedRemainingSeconds,
    keepWaiting,
    discard,
    retry,
    lastSubmission,
    applySelectionChange,
    refresh,
  } = planning;
  const canRepeat = lastSubmission?.kind === "auto";
  const generationMode = lastSubmission?.kind === "surprise" ? "surprise" : "auto";
  const submittedQuery = lastSubmission?.kind === "auto" ? lastSubmission.payload.query : null;
  const composing = phase === "idle";
  const generating =
    phase === "submitting" ||
    phase === "pending" ||
    phase === "processing" ||
    phase === "timedOut" ||
    phase === "failed";
  const generationPhase = phase !== "idle" ? phase : null;

  // `GenerationState` keeps showing its `generated` completion beat for
  // `HANDOFF_HOLD_MS` before this component swaps to `PlanResults` — a
  // shared crossfade moment instead of an abrupt unmount/mount. Adjusting
  // state during render (not in an effect) so `holdGenerated` is already
  // true on the very same render that `phase` first reports `generated`;
  // this is the documented pattern for deriving state from a prop
  // transition (react.dev, "Adjusting state when a prop changes").
  const [prevPhase, setPrevPhase] = useState(phase);
  const [holdGenerated, setHoldGenerated] = useState(false);
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    if (phase === "generated") setHoldGenerated(true);
    else if (holdGenerated) setHoldGenerated(false);
  }
  const showGenerationState = generating || (phase === "generated" && holdGenerated);
  const showResults = phase === "generated" && !holdGenerated;

  // The scroll and the timer are real side effects (DOM + a clock), so
  // they belong here, not in the render-time state adjustment above.
  useEffect(() => {
    if (!holdGenerated) return;

    hero.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });

    const id = setTimeout(() => setHoldGenerated(false), reducedMotion ? 0 : HANDOFF_HOLD_MS);
    return () => clearTimeout(id);
  }, [holdGenerated, reducedMotion]);

  // Runs after the composer is back in the tree, which is the whole
  // reason this is an effect and not a call inside the click handler:
  // when "ajustar" fires, the composer is still unmounted behind the
  // results, so there is nothing to fill yet.
  useEffect(() => {
    if (!prefill || !composing) return;
    composer.current?.fill(prefill);
    onPrefillConsumed?.();
  }, [prefill, composing, onPrefillConsumed]);

  return (
    <section
      ref={hero}
      className={styles.hero}
      data-intro-hero
      data-writing={writing ? "true" : undefined}
      aria-labelledby={composing ? "landing-headline" : undefined}
      aria-label={composing ? undefined : phase === "generated" ? "Planes generados" : "Generación de planes"}
    >
      {composing ? <HeroAmbient /> : null}
      {composing ? <HeroObjects /> : null}
      {composing ? (
        <div className={styles.atmosphere} aria-hidden="true">
          <HeroAtmosphere calm={writing} />
        </div>
      ) : null}
      <div className={styles.paperLight} aria-hidden="true" />

      <div className={styles.inner}>
        {composing ? (
          <div className={styles.stage}>
            <h1 id="landing-headline" className={styles.headline}>
              {HERO.headline.map((line, index) => (
                <span
                  key={line}
                  className={`${styles.headlineLine} ${
                    index === 0 ? styles.headlineWrite : styles.headlinePlan
                  } sp-anim-uncover`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className={styles.headlineInk}>
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p
              className={`${styles.subheadline} sp-anim-rise`}
              style={{ animationDelay: "160ms" }}
            >
              {HERO.subheadline}
            </p>

            <div
              className={`${styles.composerSlot} sp-anim-settle`}
              style={{ animationDelay: "120ms" }}
            >
              <PlanComposer
                ref={composer}
                id={HERO_COMPOSER_ID}
                submitting={sessionLoading}
                hideContext
                belowField={
                  <SurpriseButton
                    submitting={sessionLoading}
                    onResolved={onSurprise}
                  />
                }
                onFocusChange={setWriting}
                onSubmit={onSubmit}
              />
            </div>

            <div
              className={`${styles.intentsSlot} sp-anim-rise`}
              style={{ animationDelay: "320ms" }}
            >
              <IntentChips
                disabled={sessionLoading}
                onPick={(query) => composer.current?.fill(query)}
              />
            </div>

            <PreferencesHint />
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          {showGenerationState && generationPhase ? (
            <motion.div
              key="generating"
              exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              <GenerationState
                phase={generationPhase}
                failure={failure}
                onKeepWaiting={keepWaiting}
                onRetry={retry}
                onDiscard={discard}
                canRetry={lastSubmission != null}
                mode={generationMode}
                note={generationMode === "surprise" ? surpriseNote : null}
                query={query ?? submittedQuery}
                requestedAt={requestedAt}
                progressStage={progressStage}
                progressStageAt={progressStageAt}
                estimatedRemainingSeconds={estimatedRemainingSeconds}
              />
            </motion.div>
          ) : showResults ? (
            <motion.div
              key="results"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: EASE_OUT }}
            >
              <PlanResults
                plans={plans ?? []}
                query={submittedQuery}
                resolvedContext={resolvedContext}
                onAdjust={onAdjust}
                onDiscard={discard}
                canAdjust={canRepeat}
                mode={generationMode}
                note={generationMode === "surprise" ? surpriseNote : null}
                onRegenerate={onRegenerate}
                onPlanSelected={applySelectionChange}
                onSelectionReconcile={refresh}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
