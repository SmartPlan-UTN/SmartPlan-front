"use client";

import { usePathname } from "next/navigation";

import { MoodBackground } from "@/components/ui";
import { ROUTES, isActiveRoute } from "@/lib/routes";

import { moodForRoute } from "./section-mood";
import styles from "./layout.module.css";

/**
 * The user-facing app's animated wave background, mounted by the root layout.
 * The landing owns a separate quiet surface, and administration has its own
 * visual language, so both routes stay out of the shared canvas.
 *
 * On the routes that use it, keeping the canvas above the route groups lets
 * navigation read as a swell passing through the same water instead of a new
 * animation starting from zero.
 *
 * `pathname` drives both halves: the palette for the section, and the
 * `tideKey` whose change breaks the wave.
 */
export function AppBackground() {
  const pathname = usePathname();
  const isLanding = pathname === ROUTES.home;
  const isAdmin = isActiveRoute(pathname, ROUTES.admin);

  // The landing owns its own quiet cream-to-sand surface. Keeping the shared
  // canvas out of this route preserves the composer hierarchy and avoids
  // paying for an animation that the landing does not need.
  if (isLanding) return null;

  const hasNavbar =
    !isAdmin &&
    pathname !== ROUTES.login &&
    pathname !== ROUTES.signup &&
    pathname !== ROUTES.recoverPassword;

  const className = [
    styles.appBackground,
    hasNavbar ? styles.appBackgroundBelowNavbar : "",
    isAdmin ? styles.appBackgroundHidden : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} aria-hidden="true">
      <MoodBackground
        active={!isAdmin}
        mood={moodForRoute(pathname)}
        tideKey={pathname}
      />
    </div>
  );
}
