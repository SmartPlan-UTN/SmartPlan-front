"use client";

import { useCallback, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia?.(QUERY);
  if (!media) return () => {};

  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia?.(QUERY).matches === true;
}

/**
 * Whether the visitor has asked the system for reduced motion.
 *
 * `useSyncExternalStore` rather than `useState` + an effect. A media query
 * is an external store, and this is what that API is for: it reads the
 * current value during render instead of correcting itself one render
 * late, and it re-renders when the setting changes while the page is
 * open — which the previous read-once-in-an-effect version never noticed.
 *
 * The server snapshot is `false`. There are no media queries to read
 * during SSR, so the markup is built as if motion were allowed and the
 * client corrects it on hydration. Every animation on the landing is
 * either idempotent or gated inside an effect that re-runs when this
 * flips, so a first frame of "motion allowed" never leaves anything in a
 * wrong state.
 */
export function useReducedMotion(): boolean {
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
