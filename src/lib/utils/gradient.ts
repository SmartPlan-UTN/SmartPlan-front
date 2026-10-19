// Warm pastel gradients, ported verbatim from the IMG_GRADS palette in
// SmartPlanSystemDesign/v2/Results.jsx. The catalog has no real photos yet:
// a deterministic pick keeps the same card showing the same tile across
// re-renders and page reloads. No emoji on top (brand voice forbids them);
// a muted icon stands in for "no photo yet" instead. Shared by
// `ActivityCard` and `PlanCard`, which use the same "no photo" treatment.
//
// The gradients themselves are tokens (`--tile-0` ... `--tile-5` in
// src/styles/tokens.css), so the dark theme can swap each pastel for a deep
// tone of the same hue: an inline style can't follow a theme on its own.
const TILE_COUNT = 6;

export function gradientFor(id: number): string {
  return `var(--tile-${id % TILE_COUNT})`;
}
