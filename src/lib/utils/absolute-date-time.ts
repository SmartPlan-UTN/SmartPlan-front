/**
 * Formats an ISO timestamp with the user's local browser time zone using the
 * absolute date/time style expected by the Spanish (Argentina) interface.
 */
export function formatAbsoluteDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("day")}/${value("month")}/${value("year")} a las ${value("hour")}:${value("minute")}`;
}
