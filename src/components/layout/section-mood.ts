import type { Mood } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * The wave palette each section of the app sits on.
 *
 * Longest prefix wins, so `/plans/create` and `/plans/12` inherit the
 * planning mood without needing their own entry. Anything unlisted falls
 * back to `idle`, which is the neutral cream-and-amber palette — a new
 * screen gets a sane background by existing, and only opts into a mood
 * when someone decides it deserves one.
 */
const SECTION_MOODS: ReadonlyArray<readonly [string, Mood]> = [
  [ROUTES.plans, "gastronomia"],
  [ROUTES.favorites, "cultural"],
  [ROUTES.collections, "cultural"],
  [ROUTES.history, "nocturna"],
  [ROUTES.exploreMap, "aire_libre"],
  [ROUTES.explore, "idle"],
  [ROUTES.login, "romantica"],
  [ROUTES.signup, "romantica"],
  [ROUTES.recoverPassword, "romantica"],
];

export function moodForRoute(pathname: string): Mood {
  let best: Mood = "idle";
  let bestLength = -1;

  for (const [prefix, mood] of SECTION_MOODS) {
    const matches =
      pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (matches && prefix.length > bestLength) {
      best = mood;
      bestLength = prefix.length;
    }
  }

  return best;
}
