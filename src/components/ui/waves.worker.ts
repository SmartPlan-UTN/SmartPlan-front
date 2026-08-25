/// <reference lib="webworker" />

import { createWaveScene, type Mood, type WaveScene } from "./wave-scene";

/**
 * Draws the wave background off the main thread.
 *
 * This is the whole point of the worker: the swell fires the instant a
 * route changes, which is exactly when the main thread is busiest —
 * rendering the new screen, running its fade-in, re-blurring the navbar.
 * A `requestAnimationFrame` loop over there gets starved right at the
 * crest of the wave, and a 1.2s swell missing frames is what reads as the
 * water freezing. In here nothing React does can take a frame away.
 *
 * Workers have no `requestAnimationFrame`, so the loop is a timer. That's
 * fine because the scene positions the water purely from the timestamp:
 * a late tick draws where the water should be by then, not one step
 * further along, so timer jitter never accumulates into a phase shift.
 */

/** ~60fps. The scene is time-based, so this is a sampling rate, not a
 * step size — missing one costs sharpness, never continuity. */
const FRAME_MS = 1000 / 60;

export type WavesRequest =
  | {
      type: "init";
      canvas: OffscreenCanvas;
      width: number;
      height: number;
      dpr: number;
      mood: Mood;
    }
  | { type: "resize"; width: number; height: number; dpr: number }
  | { type: "mood"; mood: Mood }
  | { type: "tide" }
  | { type: "running"; running: boolean };

/** `self` is typed as a `Window` in a DOM-lib project; this is the usual
 * way to reach the worker scope's own typings. */
const workerScope = self as unknown as DedicatedWorkerGlobalScope;

let scene: WaveScene | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function stop() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function start() {
  if (timer !== null || !scene) return;
  scene.draw(performance.now());
  timer = setInterval(() => {
    scene?.draw(performance.now());
  }, FRAME_MS);
}

workerScope.onmessage = (event: MessageEvent<WavesRequest>) => {
  const message = event.data;

  switch (message.type) {
    case "init": {
      const ctx = message.canvas.getContext("2d");
      if (!ctx) return;
      scene = createWaveScene(ctx, message.mood);
      scene.resize(message.width, message.height, message.dpr);
      start();
      return;
    }
    case "resize":
      // No loop teardown here on purpose. Resizes fire constantly during
      // navigation — a scrollbar appearing as you move from a short page
      // to a long one is one — and restarting the loop on each was part
      // of the original stutter.
      scene?.resize(message.width, message.height, message.dpr);
      scene?.draw(performance.now());
      return;
    case "mood":
      scene?.setMood(message.mood, performance.now());
      return;
    case "tide":
      // Just an impulse — whether the water is drawn is `running`'s call.
      scene?.tide(performance.now());
      return;
    case "running":
      if (message.running) start();
      else stop();
      return;
  }
};
