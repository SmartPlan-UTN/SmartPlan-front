import type { ComposerStop } from "./draft";
import { nearestOrder, totalLegKm } from "./routeDistance";

import { categoryLabel } from "@/lib/utils/catalogLabels";
/** Never more than this many notes at once: the route stays calm. */
export const MAX_INSIGHTS = 2;
/** A reorder is only worth mentioning if it saves at least this much. */
const MIN_SAVING_KM = 5;
const MIN_SAVING_RATIO = 0.2;

export interface RouteInsight {
  id: "nearest-order" | "repeated-category";
  text: string;
  /** Present when the person can act on the note; it is never run for them. */
  action?: { kind: "reorder"; label: string };
}

/**
 * Suggestions about the route as it stands, derived only from data the draft
 * holds: categories and (when known) positions. They never touch the draft; a
 * reorder is only a proposal behind a button. How long the route is has its
 * own, dominant message (`getDurationHealth`), so it is not repeated here.
 * Ordered by usefulness and capped, so the route never turns into a list of
 * warnings.
 */
export function getRouteInsights(stops: ComposerStop[]): RouteInsight[] {
  const insights: RouteInsight[] = [];

  const saving = getNearestOrderSaving(stops);
  if (saving) {
    insights.push({
      id: "nearest-order",
      text: `Con otro orden recorrerías unos ${Math.round(saving.km)} km menos en línea recta.`,
      action: { kind: "reorder", label: "Ordenar por cercanía" },
    });
  }

  const repeated = mostRepeatedCategory(stops);
  if (repeated) {
    insights.push({
      id: "repeated-category",
      text: `${repeated.count} de tus paradas son de ${categoryLabel(repeated.name)}.`,
    });
  }

  return insights.slice(0, MAX_INSIGHTS);
}

/** The order the "Ordenar por cercanía" action would apply, if it helps. */
export function getNearestOrderSaving(
  stops: ComposerStop[],
): { km: number; order: ComposerStop[] } | null {
  const order = nearestOrder(stops);
  if (order.every((stop, index) => stop === stops[index])) return null;
  const current = totalLegKm(stops);
  const km = current - totalLegKm(order);
  return km >= MIN_SAVING_KM && km >= current * MIN_SAVING_RATIO
    ? { km, order }
    : null;
}

function mostRepeatedCategory(
  stops: ComposerStop[],
): { name: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const stop of stops) {
    // A stop counts once per category, however many categories it has.
    const names = new Set(stop.activity.categories.map((c) => c.name));
    for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (count >= 2 && (best === null || count > best.count)) {
      best = { name, count };
    }
  }
  return best;
}
