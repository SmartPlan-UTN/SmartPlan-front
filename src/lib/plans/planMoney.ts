import { formatArs, formatPlanTotal, observedWhen } from "@/lib/utils";
import type { PlanDetailResult } from "@/types";

/**
 * The money line of a generated plan: a total SmartPlan owns, or its
 * verdict when some prices were checked live in Google Maps (Google's
 * numbers are shown by Google's own UI, never stored by SmartPlan).
 */
export function planMoneyLine(plan: PlanDetailResult): { value: string; note: string | null } {
  const insight = plan.insight;
  const live = insight?.priceBasis === "PROVIDER_LIVE";
  const owned = plan.estimatedTotalCost != null && plan.priceCompleteness !== "NONE";
  if (owned && !live) return { value: formatPlanTotal(plan), note: "total estimado" };
  // A saved result keeps the verdict of when it was generated; it is not
  // rechecked on reopening, so say when (or nothing) instead of "hoy".
  const when = live ? observedWhen(insight?.priceCheckedAt) : null;
  const liveNote = when ? `precios verificados ${when}` : "precios verificados al generar el plan";
  if (insight?.budgetStatus === "WITHIN")
    return { value: "Dentro de tu presupuesto", note: live ? liveNote : null };
  if (live) return { value: "Precios verificados en Google Maps", note: when ? `${when}` : "al generar el plan" };
  return { value: formatPlanTotal(plan), note: null };
}

/** Whether the plan carries money SmartPlan can state (a total or a verdict). */
export function hasMoneyToShow(plan: PlanDetailResult): boolean {
  if (plan.insight?.priceBasis === "PROVIDER_LIVE") return true;
  if (plan.insight?.budgetStatus === "WITHIN") return true;
  return plan.estimatedTotalCost != null && plan.priceCompleteness !== "NONE";
}

/** Group total is the saved source of truth; divide only when group size is known. */
export function planPerPersonLine(plan: PlanDetailResult): string | null {
  const people = plan.peopleCount;
  const total = plan.estimatedTotalCost;
  const completeness = plan.priceCompleteness;
  if (
    plan.insight?.priceBasis === "PROVIDER_LIVE" ||
    typeof people !== "number" ||
    !Number.isInteger(people) ||
    people < 1 ||
    total == null ||
    completeness === "NONE"
  )
    return null;

  const perPersonMin = total / people;
  const max = plan.estimatedTotalCostMax;
  if (completeness === "RANGE" && max != null && max !== total) {
    return `${formatArs(perPersonMin)} – ${formatArs(max / people)} por persona · ${people} ${people === 1 ? "persona" : "personas"}`;
  }
  if (completeness === "PARTIAL" || completeness === "LOWER_BOUND") {
    const hasUnpricedStops = (plan.unpricedCount ?? 0) > 0;
    return `Desde ${formatArs(perPersonMin)} por persona${hasUnpricedStops ? " · hay paradas sin precio" : ""}`;
  }
  return `${formatArs(perPersonMin)} por persona · ${people} ${people === 1 ? "persona" : "personas"}`;
}
