"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  GenerationState,
  PlanComposer,
  PlanResults,
  SurpriseButton,
  type PlanComposerHandle,
  type SurpriseCoords,
  type SurpriseResolvedMeta,
} from "@/components/home";
import type { UsePlanRequestPollingResult } from "@/hooks";
import type { PlanRequestContext } from "@/types";

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
  const [writing, setWriting] = useState(false);
  const composer = useRef<PlanComposerHandle>(null);
  const hero = useRef<HTMLElement>(null);

  const {
    phase,
    plans,
    failure,
    keepWaiting,
    discard,
    retry,
    lastSubmission,
    applySelectionChange,
    refresh,
  } = planning;
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

  // A few pixels of pointer parallax across the whole object field, on
  // fine pointers only. Writes `--px`/`--py` (−0.5..0.5) on the hero
  // root; `hero-objects.module.css` scales each object against its own
  // depth factor. rAF-throttled, same shape as the scroll effect above.
  useEffect(() => {
    const node = hero.current;
    if (!node || !composing) return;
    const heroNode: HTMLElement = node;
    if (typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    function apply() {
      frame = 0;
      heroNode.style.setProperty("--px", px.toFixed(3));
      heroNode.style.setProperty("--py", py.toFixed(3));
    }

    function onMove(event: PointerEvent) {
      const rect = heroNode.getBoundingClientRect();
      px = (event.clientX - rect.left) / rect.width - 0.5;
      py = (event.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = requestAnimationFrame(apply);
    }

    function onLeave() {
      px = 0;
      py = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    heroNode.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      heroNode.removeEventListener("pointerleave", onLeave);
    };
  }, [composing]);

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
            onPlanSelected={applySelectionChange}
            onSelectionReconcile={refresh}
          />
        ) : null}
      </div>
    </section>
  );
}
