"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

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

const WAVE_LAYERS: WaveLayer[] = [
  { amplitude: 40, frequency: 1.2, speed: 0.0006, phase: 0, yOffset: 0.55, fillKey: "wave1" },
  { amplitude: 30, frequency: 1.6, speed: 0.0009, phase: 1.8, yOffset: 0.62, fillKey: "wave2" },
  { amplitude: 22, frequency: 2.0, speed: 0.0013, phase: 3.5, yOffset: 0.7, fillKey: "wave3" },
  { amplitude: 16, frequency: 2.4, speed: 0.0018, phase: 5.2, yOffset: 0.78, fillKey: "wave4" },
];

function generateWavePath(
  width: number,
  height: number,
  amplitude: number,
  frequency: number,
  phase: number,
  yBase: number,
): string {
  const points = 80;
  const step = width / points;
  let d = `M 0 ${height}`;

  for (let i = 0; i <= points; i++) {
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

/** Decorative, `aria-hidden` animated background: 4 layered SVG waves that
 * undulate independently behind the content, plus a soft mood-tinted glow. */
export function MoodBackground({ mood = "idle", style }: MoodBackgroundProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [dims, setDims] = useState({ w: 1200, h: 800 });

  const palette = WAVE_PALETTES[mood];

  useEffect(() => {
    function measure() {
      setDims({ w: window.innerWidth, h: window.innerHeight });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    startTime.current ??= Date.now();
    const start = startTime.current;

    function tick() {
      // Re-checked, not just the outer guard: TS resets narrowing for a
      // closed-over variable inside a nested function, even a `const`.
      if (!svg) return;

      const t = Date.now() - start;
      const w = svg.viewBox.baseVal.width;
      const h = svg.viewBox.baseVal.height;

      WAVE_LAYERS.forEach((layer, i) => {
        const phase = layer.phase + t * layer.speed;
        const yBase = h * layer.yOffset;
        const d = generateWavePath(w, h, layer.amplitude, layer.frequency, phase, yBase);
        pathRefs.current[i]?.setAttribute("d", d);
      });

      frameRef.current = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [dims]);

  return (
    <div
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
        {WAVE_LAYERS.map((layer, i) => (
          <path
            key={layer.fillKey}
            ref={(el) => {
              pathRefs.current[i] = el;
            }}
            fill={palette[layer.fillKey]}
            style={{ transition: "fill 1.4s ease" }}
          />
        ))}
      </svg>
    </div>
  );
}
