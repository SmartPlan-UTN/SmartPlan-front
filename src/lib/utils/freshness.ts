const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Mendoza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const shortDate = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Mendoza",
  day: "numeric",
  month: "long",
});

/**
 * When a piece of evidence was gathered, compared by calendar day in the
 * product's timezone: "hoy", "ayer" or "el 15 de octubre". Never claims
 * "hoy" for older evidence; with no date it says nothing.
 */
export function observedWhen(
  iso: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!iso) return null;
  const observed = new Date(iso);
  if (Number.isNaN(observed.getTime())) return null;
  if (dayKey(observed) === dayKey(now)) return "hoy";
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(observed) === dayKey(yesterday)) return "ayer";
  return `el ${shortDate.format(observed)}`;
}
