/**
 * The virtual Hogar (#210): games and free plans that happen at home or
 * wherever the group is. It has no address, map or distance, so every
 * screen shows the same words instead.
 */
export const AT_HOME_LABEL = "En casa / donde estén";

/** Whether a location (or a place summary) is the Hogar. */
export function isAtHomeLocation(
  location: { atHome?: boolean; place?: { kind?: string | null } | null } | null | undefined,
): boolean {
  return Boolean(location?.atHome) || location?.place?.kind === "home";
}

/** Whether an activity happens at the Hogar. */
export function isAtHomeActivity(activity: {
  atHome?: boolean;
  place?: { kind?: string | null } | null;
  locations?: ReadonlyArray<{ atHome?: boolean; place?: { kind?: string | null } | null }>;
}): boolean {
  if (activity.atHome) return true;
  if (activity.place?.kind === "home") return true;
  const locations = activity.locations ?? [];
  return locations.length > 0 && locations.every((location) => isAtHomeLocation(location));
}
