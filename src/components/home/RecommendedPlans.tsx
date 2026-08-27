"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Icon } from "@/components/ui";
import { RECOMMENDATIONS } from "@/components/landing/landingContent";
import { useRecommendations } from "@/hooks";
import { ROUTES } from "@/lib/routes";
import type { PlanRecommendation, RecommendationsMeta } from "@/types";

import { RecommendationCard } from "./RecommendationCard";
import styles from "./recommended-plans.module.css";

export interface RecommendedPlansProps {
  /** Sends the visitor back to the hero composer (empty-state CTA). */
  onStartPlan: () => void;
}

/**
 * The Home's "Planes recomendados" section (CU20 · US19 · PAN 10).
 *
 * Rendered in place of the illustrative `PlanShowcase` for a signed-in
 * visitor. It never blocks the hero:
 *
 * - `loading` — the header stays, the rail area holds its height with a
 *   discreet three-dot pulse. No skeleton, no layout jump.
 * - `error`   — the whole section disappears (`return null`); the rest of
 *   the Home is untouched.
 * - `empty`   — a warm onboarding card, not a grey "no results".
 * - `ready`   — a horizontal rail of real, navigable plans.
 */
export function RecommendedPlans({ onStartPlan }: RecommendedPlansProps) {
  const { status, items, meta } = useRecommendations();

  if (status === "error") return null;

  return (
    <section className={styles.section} aria-labelledby="recommended-title">
      {status === "empty" ? (
        <EmptyState onStartPlan={onStartPlan} />
      ) : (
        <>
          <Header meta={meta} loading={status === "loading"} />
          {status === "loading" ? <LoadingRail /> : <Rail items={items} />}
        </>
      )}
    </section>
  );
}

function Header({
  meta,
  loading,
}: {
  meta: RecommendationsMeta | null;
  loading: boolean;
}) {
  const personalized = meta?.personalized ?? true;

  return (
    <div className={styles.header}>
      <p className={`sp-label ${styles.eyebrow}`}>
        {personalized
          ? RECOMMENDATIONS.eyebrow
          : RECOMMENDATIONS.eyebrowPopular}
      </p>
      <h2 id="recommended-title" className={styles.title}>
        {personalized
          ? RECOMMENDATIONS.title
          : RECOMMENDATIONS.titlePopular}
      </h2>
      {!loading && meta ? <Subcopy meta={meta} /> : null}
    </div>
  );
}

function Subcopy({ meta }: { meta: RecommendationsMeta }) {
  if (!meta.personalized) {
    return (
      <p className={styles.subcopy}>
        {RECOMMENDATIONS.subcopy.popular}{" "}
        <Link href={ROUTES.preferences} className={styles.subcopyLink}>
          {RECOMMENDATIONS.empty.secondary}
        </Link>
        .
      </p>
    );
  }

  return (
    <p className={styles.subcopy}>
      {RECOMMENDATIONS.subcopy.full}
      {!meta.locationUsed ? (
        <>
          {" "}
          <span className={styles.locationHint}>
            {RECOMMENDATIONS.locationHint}
          </span>
        </>
      ) : null}
    </p>
  );
}

function LoadingRail() {
  return (
    <div className={styles.railViewport} aria-busy="true">
      <div className={styles.loading} aria-hidden="true">
        <span className={styles.loadingDot} />
        <span className={styles.loadingDot} />
        <span className={styles.loadingDot} />
      </div>
      <span className="sp-sr-only">Buscando planes para vos</span>
    </div>
  );
}

function Rail({ items }: { items: PlanRecommendation[] }) {
  const railRef = useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setOverflow({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, items.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollBy({
      left: direction * Math.min(el.clientWidth * 0.8, 320),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <div className={styles.railViewport}>
      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowLeft}`}
        aria-label="Ver planes anteriores"
        aria-hidden={!overflow.left}
        tabIndex={overflow.left ? 0 : -1}
        onClick={() => scrollBy(-1)}
      >
        <Icon name="chevron-left" size={18} aria-hidden="true" />
      </button>

      <ul
        ref={railRef}
        className={styles.rail}
        tabIndex={0}
        aria-label="Planes recomendados"
      >
        {items.map((recommendation) => (
          <RecommendationCard
            key={recommendation.plan.id}
            recommendation={recommendation}
          />
        ))}
      </ul>

      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowRight}`}
        aria-label="Ver más planes"
        aria-hidden={!overflow.right}
        tabIndex={overflow.right ? 0 : -1}
        onClick={() => scrollBy(1)}
      >
        <Icon name="chevron-right" size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function EmptyState({ onStartPlan }: { onStartPlan: () => void }) {
  return (
    <div className={styles.empty}>
      <p className={`sp-label ${styles.eyebrow}`}>
        {RECOMMENDATIONS.empty.eyebrow}
      </p>
      <h2 id="recommended-title" className={styles.emptyTitle}>
        {RECOMMENDATIONS.empty.title}
      </h2>
      <p className={styles.emptyBody}>{RECOMMENDATIONS.empty.body}</p>
      <div className={styles.emptyActions}>
        <button
          type="button"
          className={styles.emptyPrimary}
          onClick={onStartPlan}
        >
          {RECOMMENDATIONS.empty.primary}
        </button>
        <Link href={ROUTES.preferences} className={styles.emptySecondary}>
          {RECOMMENDATIONS.empty.secondary}
        </Link>
      </div>
    </div>
  );
}
