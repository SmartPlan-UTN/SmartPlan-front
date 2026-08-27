"use client";

import { useState } from "react";

import type {
  SurpriseCoords,
  SurpriseResolvedMeta,
} from "@/components/home";
import { SiteFooter } from "@/components/layout";
import { usePlanRequestPolling } from "@/hooks";
import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";
import type { PlanRequestContext } from "@/types";

import { FinalSearch } from "./FinalSearch";
import { HowItWorks } from "./HowItWorks";
import { ImmersiveStory } from "./ImmersiveStory";
import { InspirationGallery } from "./InspirationGallery";
import { LandingHero, HERO_COMPOSER_ID } from "./LandingHero";
import { PlanShowcase } from "./PlanShowcase";

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
 *   closing     write an idea, again, without scrolling back up
 *
 * ── Why the generation state lives here ─────────────────────────────
 *
 * Both composers submit into one `usePlanRequestPolling`. Giving each its
 * own would let the page hold two generations at once and show two
 * different answers in two places — so the state is lifted to the only
 * component that contains both fields, and the hero renders whatever
 * comes back regardless of which field started it.
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

    // Submitting from the closing field would otherwise leave the visitor
    // at the bottom of the page while the answer renders at the top.
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

  return (
    <>
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

      {/* Once a generation is under way the rest of the page is no longer
          the point: the answer is. Keeping six marketing sections under a
          running result would bury it. */}
      {planning.phase === "idle" ? (
        <>
          <InspirationGallery />
          <ImmersiveStory />
          <HowItWorks />
          <PlanShowcase />
          <FinalSearch sessionLoading={sessionLoading} onSubmit={handleSubmit} />
        </>
      ) : null}

      <SiteFooter />
    </>
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
