// Warm pastel gradients, ported verbatim from the IMG_GRADS palette in
// SmartPlanSystemDesign/v2/Results.jsx. The catalog has no real photos yet:
// a deterministic pick keeps the same card showing the same tile across
// re-renders and page reloads. No emoji on top (brand voice forbids them);
// a muted icon stands in for "no photo yet" instead. Shared by
// `ActivityCard` and `PlanCard`, which use the same "no photo" treatment.
const IMAGE_GRADIENTS = [
  "linear-gradient(155deg, #F2D9C8, #EDE0D0)",
  "linear-gradient(155deg, #C8D8F2, #D8E4F0)",
  "linear-gradient(155deg, #D0C8F2, #DDD8F0)",
  "linear-gradient(155deg, #C8E8D4, #D4EDE0)",
  "linear-gradient(155deg, #F2C8D8, #F0D4E0)",
  "linear-gradient(155deg, #F2ECC8, #EFEAD0)",
];

export function gradientFor(id: number): string {
  return IMAGE_GRADIENTS[id % IMAGE_GRADIENTS.length];
}
