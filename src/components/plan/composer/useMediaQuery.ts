"use client";

import { useCallback, useSyncExternalStore } from "react";

/** The phone layout: the composer's own 680px breakpoint. */
export const PHONE_QUERY = "(max-width: 680px)";

const canMatch = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

/**
 * Whether a media query matches, kept in sync with the window. Renders as
 * `false` on the server and in environments without `matchMedia`.
 */
export function useMediaQuery(query: string): boolean {
  // Stable per query: a new function every render would resubscribe.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (canMatch() ? window.matchMedia(query).matches : false),
    () => false,
  );
}
