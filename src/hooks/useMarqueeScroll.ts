"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const DEFAULT_SPEED_PX_PER_SEC = 28;

export interface UseMarqueeScrollResult<T extends HTMLElement> {
  /** Attach to the scrollable row itself. */
  ref: (node: T | null) => void;
  /**
   * Whether the row actually overflows and should render a second,
   * identical copy of its content for the loop to wrap into (see the hook
   * doc below). `false` — including for a single chip or a row that
   * already fits — means: render one copy, and it stays put.
   */
  needsLoop: boolean;
}

/**
 * Continuous, one-direction, seamlessly-looping horizontal scroll (CU10's
 * category chip carousel). Measures the row BEFORE any duplicate exists —
 * `needsLoop` starts `false`, so the caller renders a single copy first;
 * if that single copy overflows the visible row, `needsLoop` flips to
 * `true` (via `useLayoutEffect`, so this happens before the first paint,
 * not as a visible flash) and the caller renders a second, identical copy
 * back to back with the first.
 *
 * Once looping, this wraps `scrollLeft` back by exactly one copy's width
 * the instant it crosses that point — invisible, since the copy it wraps
 * into looks exactly like the one it left: 1-2-3 → 2-3-1 → 3-1-2 → 1-2-3,
 * never reversing direction like a ping-pong bounce. A single chip, or any
 * row that already fits without overflowing, simply never loops and stays
 * still — there's nothing to scroll.
 *
 * Pauses only while the pointer/a finger is on the row, so a chip stays
 * clickable and it doesn't fight a touch swipe. No-ops entirely under
 * `prefers-reduced-motion`.
 */
export function useMarqueeScroll<T extends HTMLElement>(
  speedPxPerSec = DEFAULT_SPEED_PX_PER_SEC,
): UseMarqueeScrollResult<T> {
  const [node, setNode] = useState<T | null>(null);
  const [needsLoop, setNeedsLoop] = useState(false);
  const ref = useCallback((element: T | null) => {
    setNode(element);
  }, []);

  useLayoutEffect(() => {
    if (!node || needsLoop) return;

    function check() {
      if (!node) return;
      // +1px tolerance: subpixel rounding can report a 0.3px "overflow"
      // for a row that visually fits perfectly, which would otherwise
      // loop a single chip back and forth by a hair.
      setNeedsLoop(node.scrollWidth > node.clientWidth + 1);
    }

    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [node, needsLoop]);

  useEffect(() => {
    if (!node || !needsLoop) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let paused = false;
    let lastTime: number | null = null;
    let frameId: number;

    function step(time: number) {
      if (!node) return;

      if (lastTime == null) lastTime = time;
      const deltaMs = time - lastTime;
      lastTime = time;

      if (!paused) {
        // Two identical copies are rendered once `needsLoop` is true, so
        // half of the scrollable width is exactly one copy.
        const loopWidth = node.scrollWidth / 2;
        if (loopWidth > 0) {
          let next = node.scrollLeft + (speedPxPerSec * deltaMs) / 1000;
          if (next >= loopWidth) {
            next -= loopWidth;
          }
          node.scrollLeft = next;
        }
      }

      frameId = requestAnimationFrame(step);
    }

    frameId = requestAnimationFrame(step);

    function pause() {
      paused = true;
    }

    function resume() {
      paused = false;
    }

    node.addEventListener("mouseenter", pause);
    node.addEventListener("mouseleave", resume);
    node.addEventListener("touchstart", pause, { passive: true });
    node.addEventListener("touchend", resume);
    node.addEventListener("touchcancel", resume);

    return () => {
      cancelAnimationFrame(frameId);
      node.removeEventListener("mouseenter", pause);
      node.removeEventListener("mouseleave", resume);
      node.removeEventListener("touchstart", pause);
      node.removeEventListener("touchend", resume);
      node.removeEventListener("touchcancel", resume);
    };
  }, [node, needsLoop, speedPxPerSec]);

  return { ref, needsLoop };
}
