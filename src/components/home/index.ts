/**
 * Plan-generation machinery (CU17, CU19).
 *
 * What lives here is the product surface the landing is built around —
 * the composer, its optional context, and the three states a generation
 * moves through. The landing's own sections live in `@/components/landing`
 * and import from this barrel.
 */

export {
  PlanComposer,
  type PlanComposerHandle,
  type PlanComposerProps,
  type ComposerVariant,
} from "./PlanComposer";
export { ContextChips, type ContextChipsProps } from "./ContextChips";
export { SurpriseAction } from "./SurpriseAction";
export { GenerationState } from "./GenerationState";
export { PlanResults } from "./PlanResults";
export { detectMood } from "./moodDetection";
