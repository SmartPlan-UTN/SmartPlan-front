/**
 * Price model mirrored from `SmartPlan-back` (`src/common/pricing/price.ts`).
 *
 * Core rule: an unknown price is NOT a free price. `UNKNOWN` carries no amount
 * and must never be rendered or summed as `$0`.
 */

export type PriceKind = "FREE" | "FIXED" | "FROM" | "RANGE" | "UNKNOWN";

export type PriceUnit =
  | "PER_PERSON"
  | "PER_GROUP"
  | "ENTRY"
  | "CONSUMPTION"
  | "UNSPECIFIED";

export type PriceSource =
  | "OFFICIAL"
  | "CURATED"
  | "USER_REPORTED"
  | "PROVIDER_HINT"
  | "LEGACY";

export type PriceConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type PriceCompleteness =
  | "EXACT"
  | "RANGE"
  | "LOWER_BOUND"
  | "PARTIAL"
  | "NONE";

/** Price of an activity, or the snapshot saved with a plan detail. */
export interface Price {
  kind: PriceKind;
  min: number | null;
  max: number | null;
  unit: PriceUnit | null;
  currency: string;
  source: PriceSource | null;
  sourceRef: string | null;
  verifiedAt: string | null;
  confidence: PriceConfidence;
  stale: boolean;
}

/** Totals fields every plan projection carries. Extras are optional for old payloads. */
export interface PlanPriceSummary {
  /** Known lower bound of the group total; `null` when nothing is priced. */
  estimatedTotalCost: number | null;
  /** Upper bound; `null` when open-ended or unpriced. */
  estimatedTotalCostMax?: number | null;
  unpricedCount?: number;
  priceCompleteness?: PriceCompleteness;
}

/** Admin input for an activity price. Omitting it means UNKNOWN. */
export interface PriceInput {
  kind: PriceKind;
  min?: number | null;
  max?: number | null;
  unit?: PriceUnit | null;
  source?: "OFFICIAL" | "CURATED" | null;
  sourceRef?: string | null;
  verifiedAt?: string | null;
}
