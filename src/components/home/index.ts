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
export {
  SurpriseButton,
  type SurpriseButtonProps,
  type SurpriseResolvedMeta,
} from "./SurpriseButton";
export {
  useSurpriseLocation,
  type SurpriseCoords,
  type SurpriseLocationState,
  type UseSurpriseLocationResult,
} from "./useSurpriseLocation";
export { GenerationState } from "./GenerationState";
export { PlanResults } from "./PlanResults";
export {
  RecommendationCard,
  type RecommendationCardProps,
} from "./RecommendationCard";
export { DismissedSlot, type DismissedSlotProps } from "./DismissedSlot";
export {
  RecommendedPlans,
  type RecommendedPlansProps,
} from "./RecommendedPlans";
export { detectMood } from "./moodDetection";
