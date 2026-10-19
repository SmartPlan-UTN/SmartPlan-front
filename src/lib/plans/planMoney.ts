import { formatPlanTotal } from "@/lib/utils";
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
  if (insight?.budgetStatus === "WITHIN")
    return { value: "Dentro de tu presupuesto", note: live ? "precios verificados hoy" : null };
  if (live) return { value: "Precios verificados hoy", note: "en Google Maps" };
  return { value: formatPlanTotal(plan), note: null };
}
