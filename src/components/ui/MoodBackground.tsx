"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";

import {
  createWaveScene,
  WAVE_PALETTES,
  type Mood,
  type WaveScene,
} from "./wave-scene";
import type { WavesRequest } from "./waves.worker";

export type { Mood } from "./wave-scene";

export interface MoodBackgroundProps {
  mood?: Mood;
  style?: CSSProperties;
  /**
   * Changing this swells the waves once and lets them settle — the tide
   * coming in. `AppShell` passes the current route, so every navigation
   * breaks a wave. Left undefined, the waves just idle.
   */
  tideKey?: string | number;
}

/**
 * Backing-store resolution cap.
 *
 * The waves are 4-14% opacity shapes with no fine detail, so a HiDPI
 * backing store buys nothing you can see and costs four times the pixels
 * to fill, four layers deep, every frame. Raise this if the curve edges
 * ever start to read as stepped.
 */
const MAX_DPR = 1;

/** Whatever is currently driving the canvas — a worker, or the main
 * thread when the browser has no `OffscreenCanvas`. */
interface WaveEngine {
  /** The canvas this engine is bound to; a remount gets a fresh one. */
  canvas: HTMLCanvasElement;
  resize(width: number, height: number, dpr: number): void;
  setMood(mood: Mood): void;
  tide(): void;
  setRunning(running: boolean): void;
  destroy(): void;
}

function createWorkerEngine(
  canvas: HTMLCanvasElement,
  mood: Mood,
  width: number,
  height: number,
  dpr: number,
): WaveEngine | null {
  if (typeof Worker === "undefined") return null;
  if (typeof canvas.transferControlToOffscreen !== "function") return null;

  let worker: Worker;
  try {
    worker = new Worker(new URL("./waves.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    return null;
  }

  const post = (message: WavesRequest, transfer?: Transferable[]) => {
    worker.postMessage(message, transfer ?? []);
  };

  // One-way door: a canvas can only be handed over once, and from here on
  // the main thread must not touch its size or context.
  const offscreen = canvas.transferControlToOffscreen();
  post({ type: "init", canvas: offscreen, width, height, dpr, mood }, [
    offscreen,
  ]);

  return {
    canvas,
    resize: (w, h, ratio) => post({ type: "resize", width: w, height: h, dpr: ratio }),
    setMood: (next) => post({ type: "mood", mood: next }),
    tide: () => post({ type: "tide" }),
    setRunning: (running) => post({ type: "running", running }),
    destroy: () => worker.terminate(),
  };
}

function createMainThreadEngine(
  canvas: HTMLCanvasElement,
  mood: Mood,
  width: number,
  height: number,
  dpr: number,
): WaveEngine | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scene: WaveScene = createWaveScene(ctx, mood);
  scene.resize(width, height, dpr);

  let frame = 0;

  function loop() {
    scene.draw(performance.now());
    frame = requestAnimationFrame(loop);
  }

  function start() {
    if (frame !== 0) return;
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    if (frame === 0) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  start();

  return {
    canvas,
    resize: (w, h, ratio) => {
      scene.resize(w, h, ratio);
      scene.draw(performance.now());
    },
    setMood: (next) => scene.setMood(next, performance.now()),
    tide: () => scene.tide(performance.now()),
    setRunning: (running) => (running ? start() : stop()),
    destroy: stop,
  };
}

/**
 * Decorative, `aria-hidden` animated background: 4 layered waves that
 * undulate independently behind the content, plus a soft mood-tinted glow.
 * Freezes on a single frame under `prefers-reduced-motion: reduce`.
 *
 * The waves are drawn into a canvas from a worker rather than animated as
 * SVG paths on the main thread. Both halves of that matter, and both are
 * about the tide staying fluid across a navigation:
 *
 * - **Off the main thread.** The swell fires the moment the route changes,
 *   which is the moment React is rendering the new screen. A main-thread
 *   loop loses its frames to that work precisely at the crest of the wave.
 * - **Canvas, not SVG.** Rewriting four full-viewport path `d` attributes
 *   per frame means re-parsing and re-rasterizing them through the
 *   document; filling four paths into a bitmap costs a fraction of it, and
 *   an `OffscreenCanvas` is the only thing a worker can draw into anyway.
 *
 * Nothing here holds the size in React state either: the `ResizeObserver`
 * talks to the engine directly, so the resizes that fire all through a
 * navigation — the scrollbar appearing as you move from a short page to a
 * long one — no longer re-render anything.
 */
export function MoodBackground({
  mood = "idle",
  style,
  tideKey,
}: MoodBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WaveEngine | null>(null);
  const teardownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstTideRef = useRef(true);
  const reducedMotionRef = useRef(false);
  // Read by the setup effect, which must not re-run when the mood changes:
  // a new engine would mean a new canvas and a wave starting from zero.
  // Seeded with the mount-time mood, then kept current by the effect below.
  const moodRef = useRef(mood);

  const palette = WAVE_PALETTES[mood];

  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Strict Mode runs setup, cleanup, setup. Tearing the engine down in
    // between would be fatal rather than wasteful: `transferControlToOffscreen`
    // can only be called once per canvas, so the second setup would have
    // nothing left to draw into. Deferring the teardown by a task lets the
    // re-setup cancel it, while a real unmount still gets cleaned up.
    if (teardownRef.current !== null) {
      clearTimeout(teardownRef.current);
      teardownRef.current = null;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;

    function measure() {
      const node = containerRef.current;
      if (!node) return { width: 0, height: 0 };
      const rect = node.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    }

    function currentDpr() {
      return Math.min(window.devicePixelRatio || 1, MAX_DPR);
    }

    // A stale engine means the component really did unmount and come back
    // with a fresh canvas; the old one is bound to a node that is gone.
    if (engineRef.current && engineRef.current.canvas !== canvas) {
      engineRef.current.destroy();
      engineRef.current = null;
    }

    if (!engineRef.current) {
      const { width, height } = measure();
      const dpr = currentDpr();
      engineRef.current =
        createWorkerEngine(canvas, moodRef.current, width, height, dpr) ??
        createMainThreadEngine(canvas, moodRef.current, width, height, dpr);
    }

    const engine = engineRef.current;
    if (!engine) return;

    function syncRunning() {
      engine?.setRunning(!document.hidden && !reducedMotionRef.current);
    }

    function handleResize() {
      const { width, height } = measure();
      engine?.resize(width, height, currentDpr());
    }

    function handleMotionChange(event: MediaQueryListEvent) {
      reducedMotionRef.current = event.matches;
      syncRunning();
    }

    syncRunning();

    // Measures the wrapper's own rendered box, not the viewport: this fills
    // its nearest positioned ancestor via `inset: 0` (or the viewport itself
    // when a caller overrides `position: fixed` through `style`, as
    // `AuthSplitShell` does), which isn't always exactly one screen tall.
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", syncRunning);
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", syncRunning);
      motionQuery.removeEventListener("change", handleMotionChange);
      teardownRef.current = setTimeout(() => {
        engineRef.current?.destroy();
        engineRef.current = null;
        teardownRef.current = null;
      }, 0);
    };
  }, []);

  useEffect(() => {
    moodRef.current = mood;
    engineRef.current?.setMood(mood);
  }, [mood]);

  useEffect(() => {
    // The first render isn't a navigation, so it shouldn't break a wave.
    if (isFirstTideRef.current) {
      isFirstTideRef.current = false;
      return;
    }
    if (reducedMotionRef.current) return;
    engineRef.current?.tide();
  }, [tideKey]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: palette.topGlow,
          transition: "background 1.4s ease",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "120%",
          height: "60%",
          background:
            "radial-gradient(ellipse at center bottom, rgba(232,93,32,0.06) 0%, transparent 70%)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />
    </div>
  );
}
