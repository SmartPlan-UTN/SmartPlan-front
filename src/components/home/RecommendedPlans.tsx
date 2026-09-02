"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";

import { Icon } from "@/components/ui";
import { Reveal } from "@/components/landing/Reveal";
import { RECOMMENDATIONS } from "@/components/landing/landingContent";
import { useRecommendations, type RecommendationSlot } from "@/hooks";
import { ROUTES } from "@/lib/routes";
import type { RecommendationsMeta } from "@/types";

import { DismissedSlot } from "./DismissedSlot";
import { RecommendationCard } from "./RecommendationCard";
import styles from "./recommended-plans.module.css";

export interface RecommendedPlansProps {
  /** Sends the visitor back to the hero composer (empty-state CTA). */
  onStartPlan: () => void;
}

/**
 * The Home's "Planes recomendados" section (CU20 · US19 · PAN 10 · CU21).
 *
 * Rendered in place of the illustrative `PlanShowcase` for a signed-in
 * visitor. It never blocks the hero and it is never silently blank — every
 * state says something:
 *
 * - `loading` — skeleton cards fill the rail with a shimmer + a caption, so
 *   the space reads as "coming", not "broken".
 * - `error`   — a quiet inline line with "Reintentar". The section stays.
 * - `empty`   — a warm onboarding card (no history yet).
 * - caught up — signed-in, has history, nothing left right now: a short note.
 * - `ready`   — a rail of real plans that settle in with a staggered reveal,
 *   each with a discreet "no me interesa" (CU21).
 */
export function RecommendedPlans({ onStartPlan }: RecommendedPlansProps) {
  const { status, slots, meta, dismiss, undo, retry } = useRecommendations();

  const body = (() => {
    if (status === "error") return <InlineError onRetry={retry} />;
    if (status === "empty") return <EmptyState onStartPlan={onStartPlan} />;
    if (status === "loading") {
      return (
        <>
          <Reveal className={styles.header}>
            <Header meta={null} loading />
          </Reveal>
          <SkeletonRail />
        </>
      );
    }
    return (
      <>
        <Reveal className={styles.header}>
          <Header meta={meta} loading={false} />
        </Reveal>
        {slots.length === 0 ? (
          <CaughtUp onStartPlan={onStartPlan} />
        ) : (
          <Rail slots={slots} onDismiss={dismiss} onUndo={undo} />
        )}
      </>
    );
  })();

  return (
    <section className={styles.section} aria-labelledby="recommended-title">
      <div className={styles.ambient} aria-hidden="true" />
      {body}
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
    <>
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
      {loading ? (
        <p className={styles.subcopy}>{RECOMMENDATIONS.loading}</p>
      ) : meta ? (
        <Subcopy meta={meta} />
      ) : null}
    </>
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
      {meta.adjustedFromFeedback ? (
        <span className={styles.feedbackNote}>
          <Icon name="sparkles" size={14} aria-hidden="true" />
          {RECOMMENDATIONS.adjustedFromFeedback}
        </span>
      ) : (
        RECOMMENDATIONS.subcopy.full
      )}
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

const SKELETON_KEYS = ["a", "b", "c", "d"] as const;

function SkeletonRail() {
  return (
    <div className={styles.railViewport} aria-busy="true">
      <ul className={styles.rail} aria-hidden="true">
        {SKELETON_KEYS.map((key, index) => (
          <li
            key={key}
            className={styles.skeletonCard}
            style={{ "--i": index } as CSSProperties}
          >
            <div className={styles.skeletonMedia} />
            <div className={styles.skeletonBody}>
              <span className={styles.skeletonLine} data-w="80" />
              <span className={styles.skeletonLine} data-w="55" />
              <span className={styles.skeletonLine} data-w="40" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Milliseconds between each card's entrance. */
const STAGGER_MS = 85;

function Rail({
  slots,
  onDismiss,
  onUndo,
}: {
  slots: RecommendationSlot[];
  onDismiss: (planId: number, title: string) => void;
  onUndo: (planId: number) => void;
}) {
  const railRef = useRef<HTMLUListElement>(null);
  const revealedRef = useRef(false);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const [snap, setSnap] = useState(false);

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const next = {
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    };
    // Bail when nothing changed — this fires on every scroll event and
    // must not re-render the rail while the visitor is dragging it.
    setOverflow((prev) =>
      prev.left === next.left && prev.right === next.right ? prev : next,
    );
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    // Pin to start, snap on next frame — see Rail.tsx.
    el.scrollLeft = 0;
    const id = requestAnimationFrame(() => setSnap(true));
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(id);
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, slots.length]);

  // Staggered entrance — armed by JS, never CSS (a page with no observer
  // just shows the cards). Runs once; dismiss/undo never re-arms.
  useEffect(() => {
    const el = railRef.current;
    if (!el || revealedRef.current) return;

    const cards = Array.from(
      el.querySelectorAll<HTMLElement>("[data-card]"),
    );
    if (cards.length === 0) return;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      revealedRef.current = true;
      return;
    }

    cards.forEach((card, index) => {
      card.classList.add("sp-reveal-armed");
      card.style.setProperty("--reveal-delay", `${index * STAGGER_MS}ms`);
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        revealedRef.current = true;
        cards.forEach((card) => {
          card.classList.remove("sp-reveal-armed");
          card.classList.add("sp-reveal-in");
        });
        observer.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [slots.length]);

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
    <div
      className={styles.railViewport}
      data-overflow-left={overflow.left ? "true" : undefined}
      data-overflow-right={overflow.right ? "true" : undefined}
    >
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
        data-snap={snap ? "true" : undefined}
        tabIndex={0}
        aria-label="Planes recomendados"
      >
        {slots.map((slot) =>
          slot.type === "card" ? (
            <RecommendationCard
              key={slot.recommendation.plan.id}
              recommendation={slot.recommendation}
              onDismiss={onDismiss}
            />
          ) : (
            <DismissedSlot
              key={slot.planId}
              planId={slot.planId}
              title={slot.title}
              phase={slot.phase}
              onUndo={onUndo}
            />
          ),
        )}
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

function InlineError({ onRetry }: { onRetry: () => void }) {
  return (
    <Reveal className={styles.inlineState}>
      <p className={`sp-label ${styles.eyebrow}`}>{RECOMMENDATIONS.eyebrow}</p>
      <h2 id="recommended-title" className={styles.inlineTitle}>
        {RECOMMENDATIONS.error.title}
      </h2>
      <button
        type="button"
        className={styles.inlineRetry}
        onClick={onRetry}
      >
        {RECOMMENDATIONS.error.retry}
      </button>
    </Reveal>
  );
}

function CaughtUp({ onStartPlan }: { onStartPlan: () => void }) {
  return (
    <Reveal className={styles.inlineState}>
      <p className={`sp-label ${styles.eyebrow}`}>{RECOMMENDATIONS.eyebrow}</p>
      <h2 id="recommended-title" className={styles.inlineTitle}>
        {RECOMMENDATIONS.caughtUp.title}
      </h2>
      <p className={styles.inlineBody}>{RECOMMENDATIONS.caughtUp.body}</p>
      <button
        type="button"
        className={styles.emptyPrimary}
        onClick={onStartPlan}
      >
        {RECOMMENDATIONS.caughtUp.action}
      </button>
    </Reveal>
  );
}

function EmptyState({ onStartPlan }: { onStartPlan: () => void }) {
  return (
    <Reveal className={styles.empty}>
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
    </Reveal>
  );
}
