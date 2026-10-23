import type {
  PlanPriceSummary,
  Price,
  PriceCompleteness,
  PriceUnit,
} from "@/types/pricing";

import { formatArs } from "./currency";

/**
 * Prices are shown honestly: an unknown price is never `$0`, a "from" price
 * says so, and a low-confidence amount is marked as an estimate.
 */

export const UNKNOWN_PRICE_LABEL = "Precio no disponible";
export const NO_PRICE_TOTAL_LABEL = "Sin precio";

/** What the backend returns for an activity-like object (old payloads omit `price`). */
export interface PricedLike {
  estimatedCost: number | null;
  price?: Price | null;
}

function unitSuffix(unit: PriceUnit | null | undefined): string {
  switch (unit) {
    case "PER_PERSON":
    case "ENTRY":
    case "CONSUMPTION":
      return " por persona";
    case "PER_GROUP":
      return " por grupo";
    default:
      return "";
  }
}

function isEstimate(price: Price): boolean {
  return price.confidence === "LOW" || price.confidence === "MEDIUM";
}

/** `true` when the price is unknown and must not be read as an amount. */
export function isPriceUnknown(priced: PricedLike): boolean {
  if (priced.price) return priced.price.kind === "UNKNOWN";
  return priced.estimatedCost === null || priced.estimatedCost === undefined;
}

/**
 * Compact price label for badges and rows.
 * `withUnit` appends "por persona" / "por grupo" when the unit is known.
 */
export function formatPrice(
  priced: PricedLike,
  options: { withUnit?: boolean } = {},
): string {
  const price = priced.price;
  if (!price) {
    return priced.estimatedCost === null || priced.estimatedCost === undefined
      ? UNKNOWN_PRICE_LABEL
      : formatArs(priced.estimatedCost);
  }
  const unit = options.withUnit ? unitSuffix(price.unit) : "";
  const approx = isEstimate(price) ? "≈ " : "";
  switch (price.kind) {
    case "FREE":
      return "Gratis";
    case "FIXED":
      return `${approx}${formatArs(price.min ?? 0)}${unit}`;
    case "FROM":
      return `Desde ${formatArs(price.min ?? 0)}${unit}`;
    case "RANGE":
      return `${formatArs(price.min ?? 0)} – ${formatArs(price.max ?? 0)}${unit}`;
    default:
      return UNKNOWN_PRICE_LABEL;
  }
}

function referenceMonth(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Short qualifier explaining how much to trust the price, or `null`. */
export function priceCaveat(priced: PricedLike): string | null {
  const price = priced.price;
  if (!price || price.kind === "UNKNOWN") return null;
  if (price.source === "LEGACY" || price.confidence === "LOW") {
    return "Precio estimado, sin verificar";
  }
  if (price.stale) {
    const when = referenceMonth(price.verifiedAt);
    return when
      ? `Precio de referencia de ${when}: confirmalo antes de ir`
      : "Precio sin verificar hace tiempo";
  }
  if (price.source === "USER_REPORTED") {
    return "Precio estimado a partir de gastos reportados";
  }
  if (price.confidence === "MEDIUM") {
    return "Precio orientativo: confirmalo antes de ir";
  }
  return null;
}

/** Plan total in the form the user can trust (exact, range, lower bound...). */
export function formatPlanTotal(plan: PlanPriceSummary): string {
  const completeness: PriceCompleteness | undefined = plan.priceCompleteness;
  const min = plan.estimatedTotalCost;
  const max = plan.estimatedTotalCostMax ?? null;

  if (min === null || min === undefined || completeness === "NONE") {
    return NO_PRICE_TOTAL_LABEL;
  }
  switch (completeness) {
    case "RANGE":
      return max !== null && max !== min
        ? `${formatArs(min)} – ${formatArs(max)}`
        : formatArs(min);
    case "LOWER_BOUND":
      return `Desde ${formatArs(min)}`;
    case "PARTIAL": {
      const count = plan.unpricedCount ?? 0;
      if (min === 0 && count > 0) return NO_PRICE_TOTAL_LABEL;
      return count > 0
        ? `${formatArs(min)} + ${count} sin precio`
        : `Desde ${formatArs(min)}`;
    }
    default:
      return formatArs(min);
  }
}

/** Per-person figure, or an em dash when there is no price to divide. */
export function formatPerPerson(perPerson: number | null | undefined): string {
  return perPerson === null || perPerson === undefined
    ? "—"
    : formatArs(perPerson);
}

/** Whether a plan total is exact (safe to compare against actual spending). */
export function isPlanTotalExact(plan: PlanPriceSummary): boolean {
  return (
    plan.estimatedTotalCost !== null &&
    plan.estimatedTotalCost !== undefined &&
    (plan.priceCompleteness === undefined || plan.priceCompleteness === "EXACT")
  );
}

interface TotalsInput {
  estimatedCost: number | null;
  price?: Price | null;
}

export interface DraftTotals extends PlanPriceSummary {
  unpricedCount: number;
  priceCompleteness: PriceCompleteness;
}

/**
 * Client-side mirror of the backend's `computePlanTotals`, used by the composer
 * while a plan is still a draft. Legacy payloads without `price` count as a
 * group amount (unit UNSPECIFIED) when a cost exists, and as UNKNOWN otherwise.
 */
export function computeDraftTotals(
  stops: TotalsInput[],
  peopleCount: number,
): DraftTotals {
  const people = Math.max(1, peopleCount);
  let min = 0;
  let max = 0;
  let open = false;
  let hasRange = false;
  let hasFrom = false;
  let unpriced = 0;
  let priced = 0;

  for (const stop of stops) {
    const price = stop.price;
    const kind = price
      ? price.kind
      : stop.estimatedCost === null
        ? "UNKNOWN"
        : "FIXED";
    if (kind === "UNKNOWN") {
      unpriced += 1;
      continue;
    }
    priced += 1;
    const lo = price ? (price.min ?? 0) : (stop.estimatedCost ?? 0);
    const hi = price ? (price.max ?? price.min ?? 0) : lo;
    const perPerson =
      price?.unit === "PER_PERSON" ||
      price?.unit === "ENTRY" ||
      price?.unit === "CONSUMPTION";
    const factor = perPerson ? people : 1;
    min += lo * factor;
    if (kind === "FROM") {
      open = true;
      hasFrom = true;
    } else {
      max += hi * factor;
      if (kind === "RANGE") hasRange = true;
    }
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  if (priced === 0 && unpriced > 0) {
    return {
      estimatedTotalCost: null,
      estimatedTotalCostMax: null,
      unpricedCount: unpriced,
      priceCompleteness: "NONE",
    };
  }
  const completeness: PriceCompleteness =
    unpriced > 0
      ? "PARTIAL"
      : hasFrom
        ? "LOWER_BOUND"
        : hasRange
          ? "RANGE"
          : "EXACT";
  return {
    estimatedTotalCost: round(min),
    estimatedTotalCostMax: open || unpriced > 0 ? null : round(max),
    unpricedCount: unpriced,
    priceCompleteness: completeness,
  };
}
