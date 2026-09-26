import type { IconName } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

export interface NavigationLink {
  href: string;
  label: string;
  icon: IconName;
}

/**
 * Main navbar navigation: Inicio, Explorar, Mis planes, Favoritos, and
 * Historial.
 *
 * Mis planes, Favoritos, and Historial are always shown, even without a
 * session: someone who enters without being logged in lands on the route
 * and the guard sends them to login with the destination saved. Hiding the
 * links would leave the application with no hints about what's behind the
 * account.
 */
const HOME_LINK: NavigationLink = { href: ROUTES.home, label: "Inicio", icon: "house" };
const EXPLORE_LINK: NavigationLink = { href: ROUTES.explore, label: "Explorar", icon: "search" };
const PLANS_LINK: NavigationLink = { href: ROUTES.plans, label: "Mis planes", icon: "route" };
const FAVORITES_LINK: NavigationLink = { href: ROUTES.favorites, label: "Favoritos", icon: "heart" };

/** Kept outside the bottom bar on purpose: see `MOBILE_LINKS`. */
const HISTORY_LINK: NavigationLink = { href: ROUTES.history, label: "Historial", icon: "clock" };

/** The navbar's primary CTA on desktop and the centre tab on mobile. */
export const CREATE_PLAN_LINK: NavigationLink = {
  href: ROUTES.createPlan,
  label: "Crear plan",
  icon: "plus",
};

export const MAIN_LINKS: readonly NavigationLink[] = [
  HOME_LINK,
  EXPLORE_LINK,
  PLANS_LINK,
  FAVORITES_LINK,
  HISTORY_LINK,
];

/**
 * Bottom bar below 900px: the five highest-frequency destinations kept
 * visible at thumb level. Built from the same entries as `MAIN_LINKS` so a
 * destination can't be named one way on desktop and another on mobile.
 *
 * Historial doesn't get a sixth tab — five is the most that fits at 320px
 * with legible labels. It lives in the account menu instead
 * (`MOBILE_USER_LINKS`).
 */
export const MOBILE_LINKS: readonly NavigationLink[] = [
  HOME_LINK,
  EXPLORE_LINK,
  CREATE_PLAN_LINK,
  PLANS_LINK,
  FAVORITES_LINK,
];

/**
 * User menu options. Seguridad (CU6's password change) sits between
 * Preferencias and Cerrar sesión — its own `/security` destination, not a
 * card on `/profile`, matching the system design's dedicated `Security.jsx`
 * screen instead of `Profile.jsx`'s duplicate inline card.
 */
export const USER_LINKS: readonly NavigationLink[] = [
  { href: ROUTES.profile, label: "Mi perfil", icon: "user" },
  { href: ROUTES.preferences, label: "Preferencias", icon: "settings" },
  { href: ROUTES.security, label: "Seguridad", icon: "lock" },
];

/** Role-specific account-menu entry for users who can access administration. */
export const ADMIN_USER_LINK: NavigationLink = {
  href: ROUTES.admin,
  label: "Panel de control",
  icon: "layout-dashboard",
};

/** Account-menu entries shown only below 900px, where `.nav` is hidden. */
export const MOBILE_USER_LINKS: readonly NavigationLink[] = [HISTORY_LINK];
