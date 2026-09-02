/** Semantic palettes for the canvas background. They live with the design
 * tokens rather than in a component; workers receive the selected palette
 * because they cannot read CSS custom properties from the DOM. */
export type Mood =
  | "idle"
  | "romantica"
  | "nocturna"
  | "aire_libre"
  | "cultural"
  | "gastronomia";

export interface WavePalette {
  wave1: string;
  wave2: string;
  wave3: string;
  wave4: string;
  topGlow: string;
}

export const WAVE_PALETTES: Record<Mood, WavePalette> = {
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
