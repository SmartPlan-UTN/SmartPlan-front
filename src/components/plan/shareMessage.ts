import { formatDuration, formatPlanTotal, formatPrice } from "@/lib/utils";
import type { PlanDetailResult } from "@/types";
import { stopLabel } from "@/lib/plans/stops";

/**
 * The WhatsApp text for a published plan: enough to read the plan without
 * opening the link — its stops, cost and time — and the link to see it whole.
 * `*…*` is WhatsApp's bold.
 */
export function planShareMessage(plan: PlanDetailResult, url: string): string {
  const stops = [...plan.details]
    .sort((left, right) => left.order - right.order)
    .map(
      (detail, index) =>
        `${index + 1}. ${stopLabel(detail)} · ⏱️ ${formatDuration(detail.estimatedDuration)} · 💵 ${formatPrice(detail)}`,
    );

  return [
    `✨ *${plan.title}*`,
    ...(plan.description ? [plan.description] : []),
    "",
    "📍 *Itinerario*",
    ...stops,
    "",
    `💰 Total estimado: ${formatPlanTotal(plan)}`,
    `⏱️ Duración: ${formatDuration(plan.estimatedTotalDuration)}`,
    "",
    `👉 Miralo completo en SmartPlan: ${url}`,
  ].join("\n");
}
