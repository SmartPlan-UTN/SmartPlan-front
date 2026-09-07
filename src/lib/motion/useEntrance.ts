"use client";

import { useSyncExternalStore } from "react";

import { usePrefersReducedMotion } from "./index";

const noop = () => () => {};

/**
 * True once React is running on the client. `useSyncExternalStore` with a
 * `false` server snapshot and a `true` client snapshot gives this without
 * a setState-in-effect — the first client render still matches the
 * server, then it flips.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/**
 * Gate for Motion `whileInView` entrances that keeps the server and the
 * first client render identical — the same rule `Reveal` follows.
 *
 * Until the component has mounted (and after it, if the visitor asked for
 * reduced motion) `active` is false: render `initial={false}` so the
 * element is in its final, visible state. The markup a crawler or a
 * no-JS page sees is never the hidden one, and there is no hydration
 * mismatch from reading `matchMedia` during render.
 */
export function useEntrance(): { active: boolean } {
  const reduced = usePrefersReducedMotion();
  const client = useIsClient();
  return { active: client && !reduced };
}
