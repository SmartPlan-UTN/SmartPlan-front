const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Formats an ISO timestamp as a short relative label ("Hace 1 h", "Ayer",
 * "Hace 3 días"), the way the admin dashboard's recent-activity feed (CU58)
 * shows audit log entries.
 */
export function formatRelativeTime(iso: string, now = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();

  if (elapsed < MINUTE) return "Recién";
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `Hace ${minutes} min`;
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `Hace ${hours} h`;
  }

  const days = Math.floor(elapsed / DAY);
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}
