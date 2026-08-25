"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export type Mood =
  | "idle"
  | "romantica"
  | "nocturna"
  | "aire_libre"
  | "cultural"
  | "gastronomia";

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

interface WavePalette {
  wave1: string;
  wave2: string;
  wave3: string;
  wave4: string;
  topGlow: string;
}

/** GPU-composited (transform + opacity only) animated wave background,
 * ported from `SmartPlanSystemDesign/v2/MoodBackground.jsx`. Very subtle
 * (5-10% opacity) color blobs that transition over 1.4s with the mood. */
const WAVE_PALETTES: Record<Mood, WavePalette> = {
  idle: {
    wave1: "rgba(232,93,32,0.07)",
    wave2: "rgba(255,209,102,0.08)",
    wave3: "rgba(232,93,32,0.05)",
    wave4: "rgba(43,91,255,0.04)",
    topGlow: "transparent",
  },
  romantica: {
    wave1: "rgba(232,93,32,0.14)",
    wave2: "rgba(196,74,20,0.10)",
    wave3: "rgba(255,170,80,0.09)",
    wave4: "rgba(180,40,80,0.06)",
    topGlow: "rgba(232,93,32,0.03)",
  },
  nocturna: {
    wave1: "rgba(43,91,255,0.12)",
    wave2: "rgba(100,60,180,0.10)",
    wave3: "rgba(26,17,9,0.08)",
    wave4: "rgba(232,93,32,0.05)",
    topGlow: "rgba(26,17,9,0.05)",
  },
  aire_libre: {
    wave1: "rgba(34,192,107,0.10)",
    wave2: "rgba(43,91,255,0.08)",
    wave3: "rgba(255,209,102,0.07)",
    wave4: "rgba(34,192,107,0.05)",
    topGlow: "transparent",
  },
  cultural: {
    wave1: "rgba(43,91,255,0.11)",
    wave2: "rgba(100,60,180,0.09)",
    wave3: "rgba(232,93,32,0.07)",
    wave4: "rgba(255,209,102,0.05)",
    topGlow: "rgba(43,91,255,0.02)",
  },
  gastronomia: {
    wave1: "rgba(232,93,32,0.13)",
    wave2: "rgba(200,121,65,0.10)",
    wave3: "rgba(255,209,102,0.08)",
    wave4: "rgba(139,34,82,0.05)",
    topGlow: "rgba(232,93,32,0.02)",
  },
};

interface WaveLayer {
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  /** Fraction from the top where the wave rests. */
  yOffset: number;
  fillKey: keyof WavePalette;
}

/** How long one swell takes to rise and settle back. */
const TIDE_MS = 1200;
/** Peak amplitude multiplier at the crest of a swell. */
const TIDE_STRENGTH = 1.2;
/** How far the water level itself rises, as a fraction of the height. */
const TIDE_RISE = 0.04;
/** Minimum gap between redraws, i.e. a ~30fps ceiling. */
const FRAME_MS = 1000 / 30;
/** Viewport height the `WAVE_LAYERS` amplitudes were drawn against. */
const REFERENCE_HEIGHT = 800;
/** Below this width the waves get a stronger swell — see `motionScale`. */
const NARROW_WIDTH = 720;

/**
 * How much to scale wave motion for the box it's drawn in.
 *
 * Amplitudes are authored in pixels against a desktop-height viewport, so
 * on a phone the same numbers cover a much smaller share of the screen and
 * the water barely seems to move. Scaling by height keeps the waves the
 * same size *relative to the screen*, and narrow viewports get an extra
 * push: they're taller than they are wide, so a swell has less room to
 * read horizontally and needs more vertical travel to land.
 */
function motionScale(width: number, height: number): number {
  const byHeight = Math.max(0.75, Math.min(1.25, height / REFERENCE_HEIGHT));
  return width < NARROW_WIDTH ? byHeight * 1.55 : byHeight;
}

/**
 * Swell shape over a single tide: 0 at rest, 1 at the crest, back to 0.
 * A half sine rises and falls symmetrically, which reads as water rather
 * than as a bounce.
 */
function tideAt(elapsed: number): number {
  if (elapsed < 0 || elapsed >= TIDE_MS) return 0;
  return Math.sin((elapsed / TIDE_MS) * Math.PI);
}

const WAVE_LAYERS: WaveLayer[] = [
  { amplitude: 40, frequency: 1.2, speed: 0.0006, phase: 0, yOffset: 0.55, fillKey: "wave1" },
  { amplitude: 30, frequency: 1.6, speed: 0.0009, phase: 1.8, yOffset: 0.62, fillKey: "wave2" },
  { amplitude: 22, frequency: 2.0, speed: 0.0013, phase: 3.5, yOffset: 0.7, fillKey: "wave3" },
  { amplitude: 16, frequency: 2.4, speed: 0.0018, phase: 5.2, yOffset: 0.78, fillKey: "wave4" },
];

/**
 * Points sampled per wave. These curves turn over roughly twice across the
 * screen, so 40 segments is already past the point where more of them
 * change the shape — and every extra point costs three sines per frame,
 * per layer.
 */
const WAVE_POINTS = 40;

function generateWavePath(
  width: number,
  height: number,
  amplitude: number,
  frequency: number,
  phase: number,
  yBase: number,
): string {
  const step = width / WAVE_POINTS;
  const angleStep = ((Math.PI * 2 * frequency) / WAVE_POINTS);
  // Built in an array and joined once: `d += ...` in the loop allocated a
  // new ~1.4KB string per point, four times a frame, which showed up as GC
  // pressure while navigating.
  const parts: string[] = [`M 0 ${height}`];

  for (let i = 0; i <= WAVE_POINTS; i++) {
    const x = i * step;
    const normalX = i * angleStep;
    const y =
      yBase +
      Math.sin(normalX + phase) * amplitude +
      Math.sin(normalX * 0.6 + phase * 1.3) * (amplitude * 0.4) +
      Math.sin(normalX * 1.8 + phase * 0.7) * (amplitude * 0.15);
    if (i === 0) {
      parts.push(` L 0 ${y.toFixed(1)}`);
    }
    parts.push(` L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  parts.push(` L ${width} ${height} Z`);
  return parts.join("");
}

/** Decorative, `aria-hidden` animated background: 4 layered SVG waves that
 * undulate independently behind the content, plus a soft mood-tinted glow.
 * Stops entirely under `prefers-reduced-motion: reduce`. */
export function MoodBackground({
  mood = "idle",
  style,
  tideKey,
}: MoodBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [dims, setDims] = useState({ w: 1200, h: 800 });
  // Held in a ref, not in state: the animation loop reads it every frame,
  // and putting it in the loop's deps would restart the clock and make the
  // waves jump back to their starting phase on every navigation.
  const tideStartRef = useRef<number | null>(null);
  const isFirstTideRef = useRef(true);
  // The wave clock outlives the animation effect on purpose. That effect
  // re-runs whenever `dims` changes — and `dims` changes on any viewport
  // resize, including the scrollbar appearing as you navigate from a short
  // page to a long one, or a mobile browser's URL bar sliding away on
  // scroll. Starting the clock inside the effect reset the phase to zero
  // every time, which read as a flicker rather than as moving water.
  const startTimeRef = useRef<number | null>(null);

  const palette = WAVE_PALETTES[mood];

  // Measures the wrapper's own rendered box, not the viewport: this fills
  // its nearest positioned ancestor via `inset: 0` (or the viewport itself
  // when a caller overrides `position: fixed` through `style`, as
  // `AuthSplitShell` does), which isn't always exactly one screen tall —
  // shorter for a sparse results page, taller for a long one. Sizing the
  // SVG viewBox off `window.innerHeight` instead mismatched the coordinate
  // system against the real box whenever content height differed from
  // viewport height, stretching or squishing the waves and cutting them
  // off at the edge. `ResizeObserver` keeps it in sync as content grows or
  // shrinks; `useLayoutEffect`, not `useEffect`, so the first painted frame
  // already uses the real size instead of the 1200×800 guess.
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function measure() {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      // Only commit a real change. The animation effect keys off `dims`,
      // so a sub-pixel reading — or the scrollbar appearing as you move
      // from a short page to a long one — used to tear down and rebuild
      // the loop on every navigation. That was the stutter.
      setDims((current) =>
        current.w === w && current.h === h ? current : { w, h },
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    // The first render isn't a navigation, so it shouldn't break a wave.
    if (isFirstTideRef.current) {
      isFirstTideRef.current = false;
      return;
    }
    tideStartRef.current = Date.now();
  }, [tideKey]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const svg = svgRef.current;
    if (!svg) return;

    startTimeRef.current ??= Date.now();
    const startTime = startTimeRef.current;
    let animationFrame: number;
    let lastDraw = 0;

    function tick() {
      // Re-checked, not just the outer guard: TS resets narrowing for a
      // closed-over variable inside a nested function, even a `const`.
      if (!svg) return;

      const now = Date.now();

      // Capped at ~30fps: the waves drift slowly enough that redrawing
      // twice as often is invisible and just doubles the work.
      if (now - lastDraw < FRAME_MS) {
        animationFrame = requestAnimationFrame(tick);
        return;
      }
      lastDraw = now;

      const elapsed = now - startTime;
      const width = svg.viewBox.baseVal.width;
      const height = svg.viewBox.baseVal.height;

      const tideStart = tideStartRef.current;
      const swell = tideStart == null ? 0 : tideAt(now - tideStart);
      const scale = motionScale(width, height);

      WAVE_LAYERS.forEach((layer, index) => {
        const phase = layer.phase + elapsed * layer.speed;
        // Deeper layers swell a little less, so the crest reads as one
        // body of water rather than four strips moving in lockstep.
        const layerSwell = swell * (1 - index * 0.15);
        const amplitude =
          layer.amplitude * scale * (1 + TIDE_STRENGTH * layerSwell);
        const yBase =
          height * (layer.yOffset - TIDE_RISE * scale * layerSwell);
        const d = generateWavePath(width, height, amplitude, layer.frequency, phase, yBase);
        pathRefs.current[index]?.setAttribute("d", d);
      });

      animationFrame = requestAnimationFrame(tick);
    }

    // A hidden tab already throttles rAF, but a background tab that never
    // stops asking for frames keeps the work queued; this drops it.
    function handleVisibility() {
      cancelAnimationFrame(animationFrame);
      if (!document.hidden) {
        lastDraw = 0;
        tick();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    if (!document.hidden) tick();

    return () => {
      cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [dims]);

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
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
      >
        {WAVE_LAYERS.map((layer, index) => (
          <path
            key={layer.fillKey}
            ref={(el) => {
              pathRefs.current[index] = el;
            }}
            fill={palette[layer.fillKey]}
            style={{ transition: "fill 1.4s ease" }}
          />
        ))}
      </svg>
    </div>
  );
}
