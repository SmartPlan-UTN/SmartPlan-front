"use client";

import { usePathname } from "next/navigation";

import { MoodBackground } from "@/components/ui";
import { ROUTES, isActiveRoute } from "@/lib/routes";

import styles from "./layout.module.css";

const AUTH_ROUTES = [
  ROUTES.login,
  ROUTES.signup,
  ROUTES.recoverPassword,
  ROUTES.resetPassword,
] as const;

/**
 * The user-facing app's animated wave background, mounted by the root layout:
 * a low horizon band with the same palette on every route. The landing owns a
 * separate quiet surface, and administration has its own visual language, so
 * both routes stay out of the shared canvas.
 *
 * On the routes that use it, keeping the canvas above the route groups lets
 * navigation read as a swell passing through the same water instead of a new
 * animation starting from zero. `pathname` is the `tideKey` whose change
 * breaks the wave; on the auth screens the band is cropped to the form panel.
 */
export function AppBackground() {
  const pathname = usePathname();
  const isLanding = pathname === ROUTES.home;
  const isAdmin = isActiveRoute(pathname, ROUTES.admin);
  const isAuth = AUTH_ROUTES.some((route) => pathname === route);

  // The landing owns its own quiet cream-to-sand surface. Keeping the shared
  // canvas out of this route preserves the composer hierarchy and avoids
  // paying for an animation that the landing does not need.
  if (isLanding) return null;

  const className = [
    styles.appBackground,
    isAuth ? styles.appBackgroundAuthHorizon : "",
    isAdmin ? styles.appBackgroundHidden : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} aria-hidden="true">
      <MoodBackground active={!isAdmin} tideKey={pathname} />
    </div>
  );
}
