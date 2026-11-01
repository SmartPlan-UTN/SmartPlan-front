import { stopLabel, stopPlace } from "@/lib/plans/stops";
import type {
  PlanDetailResult,
  PlanItineraryItem,
  PlanStopPlace,
  StopInsight,
} from "@/types";

/**
 * The stop a recommendation is "about": the one the planner built the plan
 * around (its anchor), else the first. A single-stop plan is that place.
 */
export interface PlanAnchor {
  item: PlanItineraryItem;
  index: number;
  place: PlanStopPlace | null;
  insight: StopInsight | null;
}

export function itineraryOf(plan: PlanDetailResult): PlanItineraryItem[] {
  return [...plan.details].sort((a, b) => a.order - b.order);
}

export function anchorOf(plan: PlanDetailResult): PlanAnchor | null {
  const itinerary = itineraryOf(plan);
  if (!itinerary.length) return null;
  const anchored = itinerary.findIndex(
    (item) => item.stop?.estimateBasis?.slotRole === "ANCHOR",
  );
  const index = anchored >= 0 ? anchored : 0;
  const item = itinerary[index];
  return {
    item,
    index,
    place: stopPlace(item),
    insight: plan.insight?.stops[index]?.insight ?? null,
  };
}

/** Name the experience first; keep its venue as supporting context. */
export function planHeadline(plan: PlanDetailResult): string {
  const itinerary = itineraryOf(plan);
  if (itinerary.length === 1) {
    const item = itinerary[0];
    const label = stopLabel(item).trim();
    if (label && label !== "Parada") return label;
    const place = stopPlace(item);
    if (place?.name) return place.name;
  }
  return plan.title;
}

/** "Abierto hasta las 02:00" → "Hasta las 02:00", for a compact badge. */
export function compactHours(hours: string | null): string | null {
  if (!hours) return null;
  return hours.replace(/^Abierto\s+/i, "").replace(/^hasta/i, "Hasta");
}

/** Lines of the planner's reasoning, one claim each (never scores). */
export function reasonsOf(why: string | undefined): string[] {
  if (!why) return [];
  return why
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
}

/** A calm note worth showing: not the per-field "sin confirmar" caveats. */
export function planNote(plan: PlanDetailResult): string | null {
  return (
    plan.insight?.uncertainties.find(
      (line) => !/^(Horario|Precio|Ubicación|Servicio) sin confirmar|aproximada/i.test(line),
    ) ?? null
  );
}
