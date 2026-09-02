"use client";

import { useEffect, useRef, useState } from "react";

import {
  GenerationState,
  PlanComposer,
  PlanResults,
  SurpriseButton,
  detectMood,
  type PlanComposerHandle,
  type SurpriseCoords,
  type SurpriseResolvedMeta,
} from "@/components/home";
import { MoodBackground, type Mood } from "@/components/ui";
import type { UsePlanRequestPollingResult } from "@/hooks";
import type { PlanRequestContext } from "@/types";

import { HeroAtmosphere } from "./HeroAtmosphere";
import { IntentChips } from "./IntentChips";
import { HERO } from "./landingContent";
import styles from "./hero.module.css";

export interface LandingHeroProps {
  /** Lifted into the page so the closing field drives the same state. */
  planning: UsePlanRequestPollingResult;
  sessionLoading: boolean;
  onSubmit: (query: string, context: PlanRequestContext) => void;
  onSurprise: (coords: SurpriseCoords, meta: SurpriseResolvedMeta) => void;
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
 * Three background layers, in order of how much they carry: mood waves
 * for colour, `HeroAtmosphere` for air, and a radial veil that lifts the
 * cream back up under the field so neither of the other two ever costs
 * the composer contrast.
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
  const [mood, setMood] = useState<Mood>("idle");
  const [writing, setWriting] = useState(false);
  const composer = useRef<PlanComposerHandle>(null);

  const { phase, plans, failure, keepWaiting, discard, retry, lastSubmission } = planning;
  const canRepeat = lastSubmission?.kind === "auto";
  const generationMode = lastSubmission?.kind === "surprise" ? "surprise" : "auto";
  const composing = phase === "idle";
  const generating =
    phase === "submitting" ||
    phase === "pending" ||
    phase === "processing" ||
    phase === "timedOut" ||
    phase === "failed";

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
      className={styles.hero}
      data-writing={writing ? "true" : undefined}
      aria-labelledby="landing-headline"
    >
      <div className={styles.waves} aria-hidden="true">
        <MoodBackground active={false} mood={composing ? mood : "idle"} />
      </div>
      <div className={styles.motes} aria-hidden="true">
        <HeroAtmosphere calm={writing || !composing} />
      </div>
      <div className={styles.veil} aria-hidden="true" />

      <div className={styles.inner}>
        {composing ? (
          <div className={styles.stage}>
            <p className={`${styles.eyebrow} sp-anim-rise`}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              {HERO.eyebrow}
            </p>

            <h1 id="landing-headline" className={styles.headline}>
              {HERO.headline.map((line, index) => (
                <span key={line} className={styles.headlineLine}>
                  <span
                    className={`${styles.headlineInk} sp-anim-uncover`}
                    style={{ animationDelay: `${120 + index * 110}ms` }}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p
              className={`${styles.subheadline} sp-anim-rise`}
              style={{ animationDelay: "380ms" }}
            >
              {HERO.subheadline}
            </p>

            <div
              className={`${styles.composerSlot} sp-anim-settle`}
              style={{ animationDelay: "440ms" }}
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
                onTextChange={(text) => setMood(detectMood(text))}
                onFocusChange={setWriting}
                onSubmit={onSubmit}
              />
            </div>

            <div
              className={`${styles.intentsSlot} sp-anim-rise`}
              style={{ animationDelay: "620ms" }}
            >
              <IntentChips
                disabled={sessionLoading}
                onPick={(query) => composer.current?.fill(query)}
              />
            </div>
          </div>
        ) : null}

        {generating ? (
          <GenerationState
            phase={phase}
            failure={failure}
            onKeepWaiting={keepWaiting}
            onRetry={retry}
            onDiscard={discard}
            canRetry={lastSubmission != null}
            mode={generationMode}
            note={generationMode === "surprise" ? surpriseNote : null}
          />
        ) : null}

        {phase === "generated" ? (
          <PlanResults
            plans={plans ?? []}
            onAdjust={onAdjust}
            onDiscard={discard}
            canAdjust={canRepeat}
            mode={generationMode}
            note={generationMode === "surprise" ? surpriseNote : null}
            onRegenerate={onRegenerate}
          />
        ) : null}
      </div>
    </section>
  );
}
