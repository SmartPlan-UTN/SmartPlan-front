import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clamp01, sceneProgress, useSceneClock } from "./sceneClock";

function rect(top: number, height: number): DOMRect {
  return { top, height } as DOMRect;
}

describe("sceneProgress", () => {
  it("reads the approach off the top edge", () => {
    // Top edge at the bottom of the viewport: the section has not started.
    expect(sceneProgress(rect(800, 1600), 800).enter).toBe(0);
    // Halfway up the viewport.
    expect(sceneProgress(rect(400, 1600), 800).enter).toBe(0.5);
    // Top edge at the top of the viewport: fully approached.
    expect(sceneProgress(rect(0, 1600), 800).enter).toBe(1);
  });

  it("reads the pinned track off the height beyond one viewport", () => {
    // 1600 tall in an 800 viewport is 800 of pinned travel.
    expect(sceneProgress(rect(0, 1600), 800).t).toBe(0);
    expect(sceneProgress(rect(-400, 1600), 800).t).toBe(0.5);
    expect(sceneProgress(rect(-800, 1600), 800).t).toBe(1);
  });

  it("clamps both clocks outside the section", () => {
    expect(sceneProgress(rect(2000, 1600), 800).enter).toBe(0);
    expect(sceneProgress(rect(-9000, 1600), 800).t).toBe(1);
  });

  /**
   * A section shorter than the viewport has no pinned travel at all, and
   * the divisor would be zero or negative. It is guarded to 1 rather than
   * allowed to produce an Infinity that would spread through every beat.
   */
  it("survives a section with no travel", () => {
    const { t } = sceneProgress(rect(-10, 100), 800);
    expect(Number.isFinite(t)).toBe(true);
  });
});

describe("clamp01", () => {
  it("holds the unit range", () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(9)).toBe(1);
  });
});

/**
 * The damping is the point of this clock, so it is worth pinning down: a
 * beat must not land on its target in one frame, and it must land exactly,
 * rather than creeping toward it forever and holding the rAF loop open.
 */
describe("useSceneClock", () => {
  let node: HTMLDivElement;
  let frames: FrameRequestCallback[];
  let now: number;

  beforeEach(() => {
    node = document.createElement("div");
    document.body.append(node);
    frames = [];
    // The clock's first write reads the real clock, so the fake frame
    // timestamps have to continue from there rather than restart at zero.
    now = performance.now();

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    node.remove();
  });

  /** Runs whatever frames are pending, 16ms apart. */
  function advance(count: number) {
    for (let i = 0; i < count; i += 1) {
      const pending = frames;
      frames = [];
      now += 16;
      act(() => {
        for (const callback of pending) callback(now);
      });
    }
  }

  function read(): number {
    return Number(node.style.getPropertyValue("--beat"));
  }

  it("writes the target on the first frame, before any paint", () => {
    const ref = { current: node };
    renderHook(() => useSceneClock(ref, () => ({ "--beat": 0.4 })));

    expect(read()).toBe(0.4);
    expect(frames).toHaveLength(0);
  });

  it("eases toward a moved target instead of jumping to it", () => {
    const ref = { current: node };
    let target = 0;
    renderHook(() => useSceneClock(ref, () => ({ "--beat": target })));

    expect(read()).toBe(0);

    // A wheel notch: the target moves in one step.
    target = 1;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    advance(1);

    const first = read();
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
  });

  it("arrives exactly and stops asking for frames", () => {
    const ref = { current: node };
    let target = 0;
    renderHook(() => useSceneClock(ref, () => ({ "--beat": target })));

    target = 1;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    advance(40);

    expect(read()).toBe(1);
    expect(frames).toHaveLength(0);
  });

  it("does not run at all when it is not active", () => {
    const ref = { current: node };
    renderHook(() =>
      useSceneClock(ref, () => ({ "--beat": 0.4 }), { active: false }),
    );

    expect(node.style.getPropertyValue("--beat")).toBe("");
  });
});
