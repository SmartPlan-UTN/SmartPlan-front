"use client";

import { useEffect, useState } from "react";
import { getCommunityExperiences, getCommunityPlans } from "@/lib/api";
import type { CommunityExperience, CommunityPlan } from "@/types";
import { PlanCard, StoryCard } from "./CommunityScreen";
import styles from "./community.module.css";

// Words after "en"/"por" that describe the outing, not where it happens.
const NOT_A_PLACE =
  /^(?:pareja|familia|grupo|equipo|auto|bici|bicicleta|moto|colectivo|casa|la (?:noche|tarde|mañana|semana)|el (?:finde|día)|un rato)\b/iu;
// A destination ends where the sentence moves on to something else.
const DESTINATION_END =
  /\s+(?:con|para|y|que|pero|sin|a la|al|hoy|mañana|esta|este|de (?:noche|día|tarde))\b.*$/iu;

/**
 * Planning requests are natural language; prefer the explicit destination so
 * community search can match place/city metadata instead of the whole prompt.
 * The last candidate wins: "en pareja en Godoy Cruz" means Godoy Cruz.
 */
export function communitySearchQuery(query: string): string {
  const candidates = [
    ...query.matchAll(
      /\b(?:en|por|cerca de|hasta|desde)\s+([\p{L}\p{M}\d][\p{L}\p{M}\d\s'-]*?)(?=[,?.!;:]|$)/giu,
    ),
  ]
    .flatMap((match) => match[1].split(/\s+(?:en|por|cerca de|hasta|desde)\s+/iu))
    .map((candidate) => candidate.replace(DESTINATION_END, "").trim())
    .filter((candidate) => candidate && !NOT_A_PLACE.test(candidate) && !/^\$|^\d/.test(candidate));
  return candidates.at(-1) ?? query.trim();
}

/** Community context beside generated recommendations, sourced from explicit public contributions. */
export function CommunityFindings({ query }: { query: string | null }) {
  const [matches, setMatches] = useState<{
    query: string;
    stories: CommunityExperience[];
    plans: CommunityPlan[];
  } | null>(null);
  useEffect(() => {
    if (!query?.trim()) return;
    let active = true;
    const searchQuery = communitySearchQuery(query);
    Promise.all([
      getCommunityExperiences({ q: searchQuery, limit: 2 }),
      getCommunityPlans({ q: searchQuery, limit: 3 }),
    ]).then(([experiencePage, planPage]) => {
      if (!active) return;
      setMatches({ query: query.trim(), stories: experiencePage.data, plans: planPage.data });
    }).catch(() => {
      if (active) setMatches({ query: query.trim(), stories: [], plans: [] });
    });
    return () => { active = false; };
  }, [query]);
  const currentQuery = query?.trim() ?? "";
  const stories = matches?.query === currentQuery ? matches.stories : [];
  const plans = matches?.query === currentQuery ? matches.plans : [];
  const loaded = matches?.query === currentQuery;
  if (!loaded || (!stories.length && !plans.length)) return null;
  return <aside className={styles.findings} aria-labelledby="community-findings-title">
    <div className={styles.sectionHead}><div><p className={styles.eyebrow}>OTRAS MIRADAS</p><h2 id="community-findings-title">La comunidad también encontró esto</h2></div><span className={styles.note}>Coincidencias con tu búsqueda</span></div>
    <p className={styles.findingsNote}>Las vivencias cuentan salidas pasadas. SmartPlan no toma sus precios ni horarios como vigentes; revisalos antes de ir.</p>
    {stories.length ? <div className={styles.storyGrid}>{stories.map((story) => <StoryCard key={story.id} story={story} />)}</div> : null}
    {plans.length ? <div className={styles.planGrid}>{plans.map((plan) => <PlanCard key={plan.id} plan={plan} compact />)}</div> : null}
  </aside>;
}
