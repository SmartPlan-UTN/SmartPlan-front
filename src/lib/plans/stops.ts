import { isAtHomeActivity } from "@/lib/utils/home";
import { activityDetailRoute, placeDetailRoute } from "@/lib/routes";
import type { PlanItineraryItem, PlanStopPlace } from "@/types/plans";

/**
 * One way to read a plan stop, whatever is behind it: a catalog activity or
 * the intrinsic action of a place ("Cena en Anna Bistró"). Older payloads
 * without `stop` fall back to the activity.
 */

export function isPlaceStop(item: PlanItineraryItem): boolean {
  return item.stop?.kind === "PLACE_ACTION" || item.activity === null;
}

/** What the person reads for the stop. */
export function stopLabel(item: PlanItineraryItem): string {
  return item.stop?.label ?? item.activity?.name ?? "Parada";
}

/** The place of the stop, from the unified view or the activity's first location. */
export function stopPlace(item: PlanItineraryItem): PlanStopPlace | null {
  if (item.stop?.place) return item.stop.place;
  const location = item.activity?.locations?.[0];
  if (!location) return null;
  return {
    atHome: location.atHome,
    id: location.place.id,
    name: location.place.name,
    address: location.place.address ?? null,
    kind: location.place.kind ?? null,
    kindLabel: null,
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
    googlePlaceId: location.googlePlaceId ?? null,
    departmentName: location.place.department?.name ?? null,
  };
}

/** The virtual home has no physical address, even in legacy payloads. */
export function isHomeStop(item: PlanItineraryItem): boolean {
  const place = stopPlace(item);
  return place?.kind === "home" || place?.atHome === true ||
    Boolean(item.activity && isAtHomeActivity(item.activity));
}

/** A point to draw the stop on a map, when SmartPlan knows one. */
export function stopCoordinates(
  item: PlanItineraryItem,
): { latitude: number; longitude: number } | null {
  if (isHomeStop(item)) return null;
  const location = item.activity?.locations?.find(
    (candidate) => candidate.latitude != null && candidate.longitude != null,
  );
  if (location?.latitude != null && location.longitude != null)
    return { latitude: location.latitude, longitude: location.longitude };
  const place = item.stop?.place;
  if (place?.latitude != null && place.longitude != null)
    return { latitude: place.latitude, longitude: place.longitude };
  return null;
}

/** Where tapping the stop leads: the activity, or the place. */
export function stopHref(item: PlanItineraryItem): string | null {
  if (item.activity) return activityDetailRoute(item.activity.id);
  const place = stopPlace(item);
  return place ? placeDetailRoute(place.id) : null;
}

/** Planned start as "21:00", when the planner placed the stop on a time. */
export function stopClock(item: PlanItineraryItem): string | null {
  const minute = item.stop?.startMinute;
  if (minute == null) return null;
  const wrapped = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

/** Things to know about this stop ("Horario sin confirmar"). */
export function stopCaveats(item: PlanItineraryItem): string[] {
  const caveats = item.stop?.estimateBasis?.caveats;
  return Array.isArray(caveats)
    ? caveats.filter((caveat): caveat is string => typeof caveat === "string")
    : [];
}

/** Evidence behind the stop ("Precio oficial, verificado hace 3 días"). */
export function stopEvidence(item: PlanItineraryItem): string[] {
  const evidence = item.stop?.estimateBasis?.evidence;
  return Array.isArray(evidence)
    ? evidence.filter((line): line is string => typeof line === "string")
    : [];
}

export interface PlanScreeningFacts {
  movieTitle: string;
  format: string | null;
  language: string | null;
  room: string | null;
  startsAt: string;
  movieMinutes: number | null;
  bookingUrl: string | null;
  sourceUrl: string | null;
  observedAt: string | null;
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** The current official showtime saved with a generated plan stop. */
export function stopScreening(item: PlanItineraryItem): PlanScreeningFacts | null {
  const value = item.stop?.estimateBasis?.screening;
  if (!value || typeof value !== "object") return null;
  const screening = value as Record<string, unknown>;
  if (
    typeof screening.movieTitle !== "string" ||
    typeof screening.startsAt !== "string" ||
    Number.isNaN(Date.parse(screening.startsAt))
  )
    return null;
  return {
    movieTitle: screening.movieTitle,
    format: typeof screening.format === "string" ? screening.format : null,
    language: typeof screening.language === "string" ? screening.language : null,
    room: typeof screening.room === "string" ? screening.room : null,
    startsAt: screening.startsAt,
    movieMinutes:
      typeof screening.movieMinutes === "number" ? screening.movieMinutes : null,
    bookingUrl: safeHttpsUrl(screening.bookingUrl),
    sourceUrl: safeHttpsUrl(screening.sourceUrl),
    observedAt:
      typeof screening.observedAt === "string" &&
      !Number.isNaN(Date.parse(screening.observedAt))
        ? screening.observedAt
        : null,
  };
}
