"use client";

import { useReducedMotion } from "@/hooks";

/**
 * The landing's motion vocabulary, in the terms Motion for React speaks.
 *
 * The CSS side of the same language lives in `src/styles/motion.css`; the
 * two must stay in step. Anything here is a *starting point* — the brief
 * is explicit that composition and narrative outrank the exact numbers,
 * and every value below is meant to be tuned against the real page, not
 * treated as a contract.
 */

/** `--ease-physical`: hero objects coming to rest. No overshoot. */
export const EASE_PHYSICAL = [0.22, 0.61, 0.36, 1] as const;
/** `--ease-out`: UI and copy entrances. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** `--ease-scene`: scroll-scrubbed scene changes, nearly linear. */
export const EASE_SCENE = [0.4, 0, 0.2, 1] as const;

/** The shared entrance transition for physical elements. */
export const TRANSITION = {
  duration: 0.6,
  ease: EASE_PHYSICAL,
} as const;

/** `whileInView` config: play once, when a third of the element shows. */
export const viewportOnce = { once: true, amount: 0.3 } as const;

/**
 * Reduced motion — our SSR-safe hook only.
 *
 * Motion's own `useReducedMotion` reads `matchMedia` during render, which
 * makes any markup that branches on it mismatch on hydration (server sees
 * no media query, the client does). Ours is a `useSyncExternalStore` with
 * a `false` server snapshot, so the first client render always matches
 * the server and then corrects. Wrap trees in `<MotionConfig
 * reducedMotion="user">` so Motion's internals honour the setting without
 * us reading its hook.
 */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion();
}

export { useEntrance, useIsClient } from "./useEntrance";
