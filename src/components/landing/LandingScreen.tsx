"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { MotionConfig } from "motion/react";

import type {
  SurpriseCoords,
  SurpriseResolvedMeta,
} from "@/components/home";
import { SiteFooter } from "@/components/layout";
import { usePlanRequestPolling } from "@/hooks";
import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";
import type { PlanRequestContext } from "@/types";

import { RecommendedPlans } from "@/components/home";

import { InspirationGallery } from "./InspirationGallery";
import { IntroSequence } from "./IntroSequence";
import { LandingHero, HERO_COMPOSER_ID } from "./LandingHero";
import styles from "./landing.module.css";

/**
 * Everything below the gallery is off the first screen and behind
 * `phase === "idle"`. Splitting each into its own chunk keeps the initial
 * landing payload to the hero + gallery; SSR stays on so the copy is in
 * the HTML for crawlers.
 */
const ImmersiveStory = dynamic(() =>
  import("./ImmersiveStory").then((m) => m.ImmersiveStory),
);
const HowItWorks = dynamic(() =>
  import("./HowItWorks").then((m) => m.HowItWorks),
);
const PlanShowcase = dynamic(() =>
  import("./PlanShowcase").then((m) => m.PlanShowcase),
);
const ManualExplore = dynamic(() =>
  import("./ManualExplore").then((m) => m.ManualExplore),
);

/**
 * The landing, end to end (CU17, CU19 · PAN 07).
 *
 * The order is one argument made once, and each section only exists
 * because the one before it earned it:
 *
 *   hero        write an idea — the only thing a visitor must understand
 *   gallery     what a salida can be, before any explanation
 *   story       what smartplan actually does to an idea
 *   how         the same claim in four lines, now that it means something
 *   showcase    the shape of an answer
 *   explore     a quiet manual path before the footer
 *
 * ── Why the generation state lives here ─────────────────────────────
 *
 * The hero composer and the surprise flow both submit into one
 * `usePlanRequestPolling`. The state is lifted here so that whatever
 * starts a generation — the field, "Sorpréndeme", or "ajustar" — the
 * hero renders the result in one place.
 */
export function LandingScreen() {
  const { authenticated, status } = useSession();
  const planning = usePlanRequestPolling();
  const sessionLoading = status === "loading";
  const [prefill, setPrefill] = useState<string | null>(null);
  const [surpriseNote, setSurpriseNote] = useState<string | null>(null);

  /**
   * Generation needs a session. Sending someone to log in with a
   * `redirect` back here is the honest move — the alternative, letting
   * them write and fail, spends their idea on an error.
   */
  function requireSession(): boolean {
    if (authenticated) return true;
    window.location.href = loginRoute(window.location.pathname);
    return false;
  }

  function handleSubmit(query: string, context: PlanRequestContext) {
    if (!requireSession()) return;

    planning.submit({
      query,
      context: Object.keys(context).length > 0 ? context : undefined,
    });

    // The answer renders in the hero; make sure it is in view.
    scrollToHero();
  }

  /**
   * CU17's "ajustar": go back to the composer with the previous idea
   * already in it. Discarding first is what puts the composer back on
   * screen; the hero applies `prefill` once it is mounted again.
   */
  function handleAdjust() {
    const last = planning.lastSubmission;
    if (last?.kind === "auto") setPrefill(last.payload.query);
    planning.discard();
    scrollToHero();
  }

  function handleSurprise(coords: SurpriseCoords, meta: SurpriseResolvedMeta) {
    if (!requireSession()) return;
    setSurpriseNote(surpriseNoteFor(meta));
    planning.submitSurprise(coords);
    scrollToHero();
  }

  /** Empty-state CTA (CU20): back to the hero, composer focused and ready. */
  function handleStartPlan() {
    scrollToHero();
    document
      .querySelector<HTMLTextAreaElement>(`#${HERO_COMPOSER_ID} textarea`)
      ?.focus();
  }

  return (
    <MotionConfig reducedMotion="user">
      <IntroSequence active={planning.phase === "idle"}>
        <LandingHero
          planning={planning}
          sessionLoading={sessionLoading}
          onSubmit={handleSubmit}
          onSurprise={handleSurprise}
          onRegenerate={planning.regenerate}
          surpriseNote={surpriseNote}
          onAdjust={handleAdjust}
          prefill={prefill}
          onPrefillConsumed={() => setPrefill(null)}
        />
        {planning.phase === "idle" ? <InspirationGallery /> : null}
      </IntroSequence>

      {/* Once a generation is under way the rest of the page is no longer
          the point: the answer is. Keeping six marketing sections under a
          running result would bury it. */}
      {planning.phase === "idle" ? (
        <>
          <ImmersiveStory />
          <HowItWorks />

          {/* The same slot, resolved by session (CU20). An anonymous
              visitor still needs the product explained with examples; a
              signed-in one gets their real recommendations instead — never
              both, and no extra scroll. */}
          {status === "anonymous" ? (
            <PlanShowcase />
          ) : status === "authenticated" ? (
            <RecommendedPlans onStartPlan={handleStartPlan} />
          ) : (
            <div className={styles.sessionSlot} aria-hidden="true" />
          )}

          <ManualExplore />
        </>
      ) : null}

      <SiteFooter />
    </MotionConfig>
  );
}

/**
 * The non-intrusive line the spec asks for under the surprise flow: how the
 * location was resolved, or that generation is running without saved
 * preferences.
 */
function surpriseNoteFor(meta: SurpriseResolvedMeta): string | null {
  if (meta.hasCategoryPreferences === false) {
    return "Aún no tenés preferencias guardadas, así que te sorprendemos con algo completamente nuevo.";
  }
  if (meta.source === "preferred-area") {
    return "Usamos tu ubicación preferida.";
  }
  return null;
}

function scrollToHero() {
  const hero = document.getElementById(HERO_COMPOSER_ID);
  if (!hero) return;

  hero.scrollIntoView({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "center",
  });
}
