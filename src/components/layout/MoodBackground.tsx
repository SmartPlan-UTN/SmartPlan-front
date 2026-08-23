"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type Mood =
  | "idle"
  | "romantica"
  | "nocturna"
  | "aire_libre"
  | "cultural"
  | "gastronomia";

export interface MoodBackgroundProps {
  mood?: Mood;
}

interface WavePalette {
  wave1: string;
  wave2: string;
  wave3: string;
  wave4: string;
  topGlow: string;
}

/** Ported from SmartPlanSystemDesign/v2/MoodBackground.jsx. */
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
  yOffset: number;
  fillKey: keyof WavePalette;
}

const WAVE_LAYERS: WaveLayer[] = [
  { amplitude: 40, frequency: 1.2, speed: 0.0006, phase: 0, yOffset: 0.55, fillKey: "wave1" },
  { amplitude: 30, frequency: 1.6, speed: 0.0009, phase: 1.8, yOffset: 0.62, fillKey: "wave2" },
  { amplitude: 22, frequency: 2.0, speed: 0.0013, phase: 3.5, yOffset: 0.7, fillKey: "wave3" },
  { amplitude: 16, frequency: 2.4, speed: 0.0018, phase: 5.2, yOffset: 0.78, fillKey: "wave4" },
];

const WAVE_POINTS = 80;

function generateWavePath(
  width: number,
  height: number,
  amplitude: number,
  frequency: number,
  phase: number,
  yBase: number,
): string {
  const step = width / WAVE_POINTS;
  let d = `M 0 ${height}`;

  for (let i = 0; i <= WAVE_POINTS; i++) {
    const x = i * step;
    const normalX = (x / width) * Math.PI * 2 * frequency;
    const y =
      yBase +
      Math.sin(normalX + phase) * amplitude +
      Math.sin(normalX * 0.6 + phase * 1.3) * (amplitude * 0.4) +
      Math.sin(normalX * 1.8 + phase * 0.7) * (amplitude * 0.15);

    if (i === 0) {
      d += ` L 0 ${y}`;
    }
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  d += ` L ${width} ${height} Z`;
  return d;
}

/**
 * Decorative animated background of layered SVG waves, ported from
 * SmartPlanSystemDesign/v2/MoodBackground.jsx. Purely visual —
 * `aria-hidden` and `pointer-events: none` — so it never competes with the
 * content in front of it.
 *
 * The source drives the animation with `requestAnimationFrame`, recomputing
 * every path every frame; unlike the source, this stops entirely under
 * `prefers-reduced-motion: reduce` instead of just skipping the unrelated
 * float keyframes.
 */
export function MoodBackground({ mood = "idle" }: MoodBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [dims, setDims] = useState({ w: 1200, h: 800 });
  const palette = WAVE_PALETTES[mood];

  // Measures the wrapper's own rendered box, not the viewport: this fills
  // `.backdrop` (its `position: relative` parent) via `inset: 0`, which is
  // as tall as the page's actual content — shorter than one screen for a
  // sparse results page, taller for a long one. Sizing the SVG viewBox off
  // `window.innerHeight` instead mismatched the coordinate system against
  // the real box whenever content height differed from viewport height,
  // stretching or squishing the waves and cutting them off at the edge.
  // `ResizeObserver` keeps it in sync as content grows (more results,
  // pagination) or shrinks (fewer results, switching tabs).
  // `useLayoutEffect`, not `useEffect`: measuring after paint let the
  // browser show one frame at the default 1200×800 guess first — visible as
  // a flash of wrongly-proportioned waves before the real size kicked in.
  // Measuring before paint means the first frame the user sees is already
  // correct.
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function measure() {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
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
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      return;
    }

    const startTime = Date.now();
    let animationFrame: number;

    function tick() {
      const svg = svgRef.current;
      if (!svg) return;

      const elapsed = Date.now() - startTime;
      const width = svg.viewBox.baseVal.width;
      const height = svg.viewBox.baseVal.height;

      WAVE_LAYERS.forEach((layer, index) => {
        const phase = layer.phase + elapsed * layer.speed;
        const yBase = height * layer.yOffset;
        const d = generateWavePath(width, height, layer.amplitude, layer.frequency, phase, yBase);
        pathRefs.current[index]?.setAttribute("d", d);
      });

      animationFrame = requestAnimationFrame(tick);
    }

    tick();
    return () => {
      cancelAnimationFrame(animationFrame);
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
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
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
