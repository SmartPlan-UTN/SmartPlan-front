/** The single colour set for the canvas background. It lives with the
 * design tokens rather than in a component; the worker receives it by
 * import because it cannot read CSS custom properties from the DOM. */
export interface WavePalette {
  wave1: string;
  wave2: string;
  wave3: string;
  wave4: string;
}

export const WAVE_PALETTE: WavePalette = {
  wave1: "rgba(232,93,32,0.07)",
  wave2: "rgba(255,209,102,0.08)",
  wave3: "rgba(232,93,32,0.05)",
  wave4: "rgba(43,91,255,0.04)",
};
