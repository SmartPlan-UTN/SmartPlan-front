"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseScrollProgressResult<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  /** 0 when the element's travel begins, 1 when it ends. */
  progress: number;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Maps an element's journey through the viewport onto a 0 → 1 float.
 *
 * Built for pinned, scroll-scrubbed sections: the element is made taller
 * than the viewport and its inner content is `position: sticky`, so
 * "progress" means how far the visitor has scrolled through that extra
 * height while the content is held still.
 *
 * `progress` is state, so it re-renders — that is fine for anything
 * driving CSS custom properties, but a canvas should read `ref.current`
 * from its own animation loop instead of re-rendering per frame. Both
 * consumers exist in this landing, so the value is exposed as state and
 * the canvas keeps its own ref.
 *
 * Reads are rAF-throttled: a raw scroll handler that calls
 * `getBoundingClientRect` fires far more often than the compositor can
 * paint, and each call forces a synchronous layout.
 */
export function useScrollProgress<T extends HTMLElement>(): UseScrollProgressResult<T> {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    // The element's own height minus one viewport is the distance over
    // which a sticky child stays pinned. Guard the divisor: an element
    // shorter than the viewport would divide by zero or a negative.
    const travel = rect.height - window.innerHeight;
    if (travel <= 0) {
      setProgress(clamp01(1 - rect.bottom / (rect.height + window.innerHeight)));
      return;
    }

    setProgress(clamp01(-rect.top / travel));
  }, []);

  useEffect(() => {
    function onScroll() {
      if (frame.current != null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        measure();
      });
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [measure]);

  return { ref, progress };
}
