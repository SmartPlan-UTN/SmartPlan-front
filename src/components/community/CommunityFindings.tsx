"use client";

import { useEffect, useState } from "react";
import { getCommunityExperiences, getCommunityPlans } from "@/lib/api";
import type { CommunityExperience, CommunityPlan } from "@/types";
import { PlanCard, StoryCard } from "./CommunityScreen";
import styles from "./community.module.css";

function communitySearchQuery(query: string) {
  // Planning requests are natural language; prefer the explicit destination so
  // community search can match place/city metadata instead of the whole prompt.
  const destination = query.match(
    /\b(?:en|por|cerca de|hasta|desde)\s+([\p{L}\p{M}\d][\p{L}\p{M}\d\s'-]*?)(?=[,?.!;:]|$)/iu,
  )?.[1];
  return destination?.trim() || query.trim();
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
