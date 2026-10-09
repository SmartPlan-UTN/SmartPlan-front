"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Room kept below a pinned panel, in px. */
const BOTTOM_GAP = 16;

/**
 * Lets a pinned panel taller than the viewport scroll with the page until its
 * end is visible, then pin there, instead of being cut off or growing its own
 * scrollbar. CSS does the pinning (`top: calc(pin - var(--sticky-overflow))`);
 * this only reports how much taller than the room it has the panel is, which
 * CSS cannot know about its own height.
 */
export function useStickyOverflow(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    function update() {
      if (!element) return;
      const top = Number.parseFloat(getComputedStyle(element).top);
      if (Number.isNaN(top)) {
        // Not pinned (small screens): nothing to compensate.
        element.style.removeProperty("--sticky-overflow");
        return;
      }
      // `top` already has the previous overflow subtracted; add it back to
      // get where the panel pins when it fits.
      const previous =
        Number.parseFloat(element.style.getPropertyValue("--sticky-overflow")) ||
        0;
      const room = window.innerHeight - (top + previous) - BOTTOM_GAP;
      const overflow = Math.max(0, Math.ceil(element.offsetHeight - room));
      element.style.setProperty("--sticky-overflow", `${overflow}px`);
    }

    update();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref]);
}
