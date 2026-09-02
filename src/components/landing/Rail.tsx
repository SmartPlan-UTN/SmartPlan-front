"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Icon } from "@/components/ui";

import styles from "./rail.module.css";

export interface RailProps {
  /** The `<li>` items. The rail renders the `<ul>` around them. */
  children: ReactNode;
  /** Names the scrollable region for assistive tech. */
  ariaLabel: string;
  className?: string;
  /** Opt-in autoplay for anonymous, illustrative content only. */
  autoAdvance?: boolean;
  autoAdvanceIntervalMs?: number;
}

export function getAutoAdvanceTarget(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  direction: 1 | -1,
) {
  const maximum = Math.max(0, scrollWidth - clientWidth);
  let nextDirection = direction;
  if (scrollLeft >= maximum - 4) nextDirection = -1;
  if (scrollLeft <= 4) nextDirection = 1;
  const step = clientWidth * 0.625;
  return {
    left: Math.min(maximum, Math.max(0, scrollLeft + step * nextDirection)),
    direction: nextDirection,
  };
}

/**
 * A horizontal, snap-scrolled rail with the affordances a bare
 * `overflow-x: auto` list is missing: an edge fade that says "there is
 * more this way", pointer arrows on wide viewports, arrow-key scrolling,
 * and a first paint that lands the first item flush with the header
 * rather than letting the browser's initial snap nudge it out of line.
 *
 * The clip that stops the rail leaking horizontal scroll into the
 * document lives on the *section* around this component (see the callers'
 * CSS) — a rule learned the hard way and kept.
 */
export function Rail({
  children,
  ariaLabel,
  className,
  autoAdvance = false,
  autoAdvanceIntervalMs = 5000,
}: RailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const pauseUntilRef = useRef(0);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const visibleRef = useRef(false);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const [snap, setSnap] = useState(false);

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const next = {
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    };
    setOverflow((prev) =>
      prev.left === next.left && prev.right === next.right ? prev : next,
    );
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    // Pin to the start, then turn snapping on a frame later — otherwise
    // the browser's load-time snap can shove the first card ~150px in.
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
  }, [measure]);

  const pauseAutoAdvance = useCallback(() => {
    pauseUntilRef.current = Date.now() + 8000;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const rail = railRef.current;
    if (!autoAdvance || !viewport || !rail) return;
    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia?.("(max-width: 899px)").matches
    ) return;

    visibleRef.current = typeof IntersectionObserver === "undefined";
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(
          ([entry]) => {
            visibleRef.current = entry.isIntersecting;
          },
          { threshold: 0.2 },
        );
    observer?.observe(viewport);

    const interval = window.setInterval(() => {
      if (
        !visibleRef.current ||
        hoveredRef.current ||
        focusedRef.current ||
        Date.now() < pauseUntilRef.current
      ) return;

      const target = getAutoAdvanceTarget(
        rail.scrollLeft,
        rail.clientWidth,
        rail.scrollWidth,
        directionRef.current,
      );
      directionRef.current = target.direction;
      rail.scrollTo({ left: target.left, behavior: "smooth" });
    }, autoAdvanceIntervalMs);

    return () => {
      observer?.disconnect();
      window.clearInterval(interval);
    };
  }, [autoAdvance, autoAdvanceIntervalMs]);

  const scrollByDir = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    pauseAutoAdvance();
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollBy({
      left: direction * Math.min(el.clientWidth * 0.8, 340),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <div
      ref={viewportRef}
      className={`${styles.viewport}${className ? ` ${className}` : ""}`}
      data-overflow-left={overflow.left ? "true" : undefined}
      data-overflow-right={overflow.right ? "true" : undefined}
      onPointerEnter={() => {
        hoveredRef.current = true;
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
        pauseAutoAdvance();
      }}
      onFocusCapture={() => {
        focusedRef.current = true;
        pauseAutoAdvance();
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focusedRef.current = false;
          pauseAutoAdvance();
        }
      }}
      onWheel={pauseAutoAdvance}
      onTouchStart={pauseAutoAdvance}
      onPointerDown={pauseAutoAdvance}
      onKeyDown={pauseAutoAdvance}
    >
      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowLeft}`}
        aria-label="Ver anteriores"
        aria-hidden={!overflow.left}
        tabIndex={overflow.left ? 0 : -1}
        onClick={() => scrollByDir(-1)}
      >
        <Icon name="chevron-left" size={18} aria-hidden="true" />
      </button>

      <ul
        ref={railRef}
        className={styles.rail}
        data-snap={snap ? "true" : undefined}
        tabIndex={0}
        aria-label={ariaLabel}
      >
        {children}
      </ul>

      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowRight}`}
        aria-label="Ver más"
        aria-hidden={!overflow.right}
        tabIndex={overflow.right ? 0 : -1}
        onClick={() => scrollByDir(1)}
      >
        <Icon name="chevron-right" size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
