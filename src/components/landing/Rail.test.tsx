import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getAutoAdvanceTarget, Rail } from "./Rail";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Rail autoplay", () => {
  it("advances by 62.5% and reverses at the edges", () => {
    expect(getAutoAdvanceTarget(0, 800, 2000, 1)).toEqual({
      left: 500,
      direction: 1,
    });
    expect(getAutoAdvanceTarget(1200, 800, 2000, 1)).toEqual({
      left: 700,
      direction: -1,
    });
  });

  it("pauses on pointer interaction and resumes after eight seconds", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback;
        }
        callback: IntersectionObserverCallback;
        observe = (target: Element) =>
          this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as never);
        disconnect = vi.fn();
      },
    );

    render(
      <Rail ariaLabel="Ejemplos" autoAdvance autoAdvanceIntervalMs={5000}>
        <li>Uno</li>
        <li>Dos</li>
      </Rail>,
    );
    const rail = screen.getByRole("list", { name: "Ejemplos" });
    Object.defineProperties(rail, {
      clientWidth: { configurable: true, value: 800 },
      scrollWidth: { configurable: true, value: 2000 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });
    const scrollTo = vi.fn();
    rail.scrollTo = scrollTo;
    const viewport = rail.parentElement;
    expect(viewport).not.toBeNull();
    if (!viewport) throw new Error("Rail viewport was not rendered");

    vi.advanceTimersByTime(5000);
    expect(scrollTo).toHaveBeenCalledWith({ left: 500, behavior: "smooth" });

    fireEvent.pointerEnter(viewport);
    vi.advanceTimersByTime(5000);
    expect(scrollTo).toHaveBeenCalledTimes(1);

    fireEvent.pointerLeave(viewport);
    vi.advanceTimersByTime(5000);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });
});
