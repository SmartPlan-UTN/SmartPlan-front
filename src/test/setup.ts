import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

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
