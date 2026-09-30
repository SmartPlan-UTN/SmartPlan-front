import type { IconName } from "@/components/ui";
import { PLAN_COMPOSER_ROUTE, ROUTES } from "@/lib/routes";

export interface NavigationLink {
  href: string;
  label: string;
  icon: IconName;
}

/**
 * Main navbar navigation: Inicio, Explorar, Mis planes, Mis salidas, and
 * Favoritos (#130). Four different collections, four different meanings:
 * Mis planes is what the person created, Mis salidas what they chose to do
 * and did, and Favoritos what they saved for later.
 *
 * The private destinations are always shown, even without a session:
 * someone who enters without being logged in lands on the route and the
 * guard sends them to login with the destination saved. Hiding the links
 * would leave the application with no hints about what's behind the
 * account.
 */
const HOME_LINK: NavigationLink = { href: ROUTES.home, label: "Inicio", icon: "house" };
const EXPLORE_LINK: NavigationLink = { href: ROUTES.explore, label: "Explorar", icon: "search" };
const PLANS_LINK: NavigationLink = { href: ROUTES.plans, label: "Mis planes", icon: "route" };
const FAVORITES_LINK: NavigationLink = { href: ROUTES.favorites, label: "Favoritos", icon: "heart" };

const OUTINGS_LINK: NavigationLink = {
  href: ROUTES.outings,
  label: "Mis salidas",
  icon: "calendar-check",
};

/**
 * The centre tab on mobile: SmartPlan's main feature, planning an outing
 * from Inicio's composer. Desktop has no equivalent CTA — Inicio is already
 * in the bar, and "Crear un plan" lives inside Mis planes.
 */
export const PLAN_OUTING_LINK: NavigationLink = {
  href: PLAN_COMPOSER_ROUTE,
  label: "Planificar",
  icon: "sparkles",
};

export const MAIN_LINKS: readonly NavigationLink[] = [
  HOME_LINK,
  EXPLORE_LINK,
  PLANS_LINK,
  OUTINGS_LINK,
  FAVORITES_LINK,
];

/**
 * Bottom bar below 900px: the five highest-frequency destinations kept
 * visible at thumb level. Built from the same entries as `MAIN_LINKS` so a
 * destination can't be named one way on desktop and another on mobile.
 * Inicio stays reachable through the brand logo; keeping it here as well as
 * Planificar duplicated the same screen and displaced Mis salidas.
 */
export const MOBILE_LINKS: readonly NavigationLink[] = [
  EXPLORE_LINK,
  PLANS_LINK,
  PLAN_OUTING_LINK,
  OUTINGS_LINK,
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
