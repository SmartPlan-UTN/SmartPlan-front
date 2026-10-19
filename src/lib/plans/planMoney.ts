import { formatPlanTotal, observedWhen } from "@/lib/utils";
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
