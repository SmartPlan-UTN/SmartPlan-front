import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTypewriter } from "./useTypewriter";

const PHRASES = ["hola", "chau"] as const;

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("useTypewriter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Removes the per-character jitter so the assertions below can advance
    // by a known number of milliseconds instead of a range.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("types the first phrase one character at a time", () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useTypewriter(PHRASES));

    expect(result.current.text).toBe("");
    expect(result.current.animating).toBe(true);

    // Past the opening gap (520ms) but short of the second character,
    // which lands at ~568ms with the jitter pinned to 0.5. Advancing a
    // round 600ms here asserted one character and got two.
    act(() => {
      vi.advanceTimersByTime(530);
    });
    expect(result.current.text).toBe("h");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect("hola").toContain(result.current.text);
    expect(result.current.text.length).toBeGreaterThan(1);
  });

  it("returns the first phrase whole, unanimated, under reduced motion", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useTypewriter(PHRASES));

    expect(result.current.text).toBe("hola");
    expect(result.current.animating).toBe(false);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.text).toBe("hola");
  });

  it("stops scheduling work while inactive", () => {
    mockReducedMotion(false);
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useTypewriter(PHRASES, active),
      { initialProps: { active: true } },
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });
    const typed = result.current.text;
    expect(typed.length).toBeGreaterThan(0);

    rerender({ active: false });
    expect(result.current.animating).toBe(false);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.text).toBe(typed);
  });

  it("does nothing at all with an empty phrase list", () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useTypewriter([]));

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.text).toBe("");
    expect(result.current.animating).toBe(false);
  });
});
