import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach } from "vitest";

/**
 * Animations never finish under jsdom (no frames), which would keep exiting
 * rows in the DOM forever. Skipping them makes motion apply end states at
 * once, which is what every assertion here wants.
 */
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
});

/**
 * jsdom has no 2D canvas. Its `getContext` logs a "Not implemented"
 * notice on every call and then returns null, which buried real test
 * output under noise once the landing's two canvas layers existed.
 *
 * Returning null explicitly is not a workaround for the components: every
 * canvas on the landing already treats a missing context as "this browser
 * cannot draw it" and bails out, leaving the text content that carries
 * the same information. This stub is what exercises that path.
 */
HTMLCanvasElement.prototype.getContext = () => null;

/**
 * jsdom has no `IntersectionObserver`. Components that reveal on scroll
 * (`Reveal`, `ImmersiveStory`) already guard with `typeof … === "undefined"`
 * and degrade to visible; `FloatingBackLink` does not, so a stub keeps detail
 * screens renderable in tests. It observes nothing — the observed state is
 * never asserted.
 */
if (typeof globalThis.IntersectionObserver === "undefined") {
  class IntersectionObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): [] {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}

/**
 * jsdom does not implement scrolling: `window.scrollTo` only logs "Not
 * implemented". Screens that restore a scroll position (the plan composer's
 * catalog/route tabs) call it, so a no-op keeps the output readable.
 */
window.scrollTo = (() => undefined) as typeof window.scrollTo;
