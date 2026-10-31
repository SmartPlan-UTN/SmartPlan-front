import { formatDuration } from "@/lib/utils";

/**
 * How long a route is, as guidance. There is deliberately no rule here: the
 * requirements and the domain do not say that a plan must fit in one day
 * (plans carry no date, and the product vision includes trip planning), so
 * neither the API nor this screen forbids a long plan. What the screen does is
 * make sure a person never builds one by accident. See docs/planning.md in
 * SmartPlan-back ("open business decision").
 */

/** A full day: past this the route is flagged as longer than a day. */
export const DAY_MINUTES = 24 * 60;

/**
 * From here on a plan is a lot to ask of one day (a full day out, before
 * travel and meals). Guidance only.
 */
export const LONG_PLAN_MINUTES = 8 * 60;

export type DurationLevel = "normal" | "long" | "beyondDay";

export interface DurationHealth {
  level: DurationLevel;
  /** True when the route is longer than a day: strong guidance, never a block. */
  exceedsDay: boolean;
  /** The one message that describes the route's health; null when normal. */
  title: string | null;
  message: string | null;
}

/** Where a total duration stands: normal, long, or longer than a day. */
export function getDurationHealth(totalMinutes: number): DurationHealth {
  if (totalMinutes > DAY_MINUTES) {
    return {
      level: "beyondDay",
      exceedsDay: true,
      title: "Este recorrido supera un día completo",
      message: `Suma ${formatDuration(totalMinutes)}, más de 24 h. Si es un viaje de varios días, está bien; si es una salida de un día, convendría quitar algunas paradas.`,
    };
  }
  if (totalMinutes > LONG_PLAN_MINUTES) {
    return {
      level: "long",
      exceedsDay: false,
      title: "Va a ser un día intenso",
      message: `Tu recorrido ya suma ${formatDuration(totalMinutes)}. Podés seguir, pero es un día largo.`,
    };
  }
  return { level: "normal", exceedsDay: false, title: null, message: null };
}
