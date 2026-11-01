import { formatPlanTotal } from "@/lib/utils";
import type { PlanPriceSummary } from "@/types/pricing";

/** Stable number for a handle, so a person keeps the same avatar tone everywhere. */
export function personSeed(username: string): number {
  let hash = 0;
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

const LONG_DATE = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const MONTH_YEAR = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

export function formatLongDate(iso: string): string {
  return LONG_DATE.format(new Date(iso));
}

export function formatMonthYear(iso: string): string {
  return MONTH_YEAR.format(new Date(iso));
}

export function pluralize(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

type PlanRef = { id: number; title: string; creatorUsername: string | null };

/**
 * The credit chain of a lived experience: the plan it was done from, and the
 * original that plan itself came from (only when that is a different plan).
 */
export function storyOrigins(story: {
  plan?: PlanRef | null;
  inspiredBy?: PlanRef | null;
}): { livedFrom: PlanRef | null; inspiredBy: PlanRef | null } {
  const livedFrom = story.plan ?? null;
  const inspiredBy =
    story.inspiredBy && story.inspiredBy.id !== livedFrom?.id
      ? story.inspiredBy
      : null;
  return { livedFrom, inspiredBy };
}

/** What a plan costs, in words: a plan that is exactly free says so. */
export function planCostLabel(plan: PlanPriceSummary): string {
  return plan.priceCompleteness === "EXACT" && plan.estimatedTotalCost === 0
    ? "Gratis"
    : formatPlanTotal(plan);
}
