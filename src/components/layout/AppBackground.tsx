"use client";

import { usePathname } from "next/navigation";

import { MoodBackground } from "@/components/ui";
import { ROUTES, isActiveRoute } from "@/lib/routes";

import { moodForRoute } from "./section-mood";
import styles from "./layout.module.css";

/**
 * The user-facing app's animated wave background, mounted once by the root
 * layout. Administration has its own visual language, so the canvas stays
 * mounted there to preserve its phase but is hidden and paused.
 *
 * Keeping the canvas above the route groups is what lets navigation read as
 * a swell passing through the same water instead of a new animation starting
 * from zero.
 *
 * `pathname` drives both halves: the palette for the section, and the
 * `tideKey` whose change breaks the wave.
 */
export function AppBackground() {
  const pathname = usePathname();
  const isAdmin = isActiveRoute(pathname, ROUTES.admin);
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
