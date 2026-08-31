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
export function Rail({ children, ariaLabel, className }: RailProps) {
  const railRef = useRef<HTMLUListElement>(null);
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

  const scrollByDir = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
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
      className={`${styles.viewport}${className ? ` ${className}` : ""}`}
      data-overflow-left={overflow.left ? "true" : undefined}
      data-overflow-right={overflow.right ? "true" : undefined}
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
