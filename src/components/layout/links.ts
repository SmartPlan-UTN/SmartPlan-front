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
export const MAIN_LINKS: readonly NavigationLink[] = [
  { href: ROUTES.home, label: "Inicio", icon: "house" },
  { href: ROUTES.explore, label: "Explorar", icon: "search" },
  { href: ROUTES.plans, label: "Mis planes", icon: "route" },
  { href: ROUTES.favorites, label: "Favoritos", icon: "heart" },
  { href: ROUTES.history, label: "Historial", icon: "clock" },
];

/** User menu options. */
export const USER_LINKS: readonly NavigationLink[] = [
  { href: ROUTES.profile, label: "Mi perfil", icon: "user" },
  { href: ROUTES.preferences, label: "Preferencias", icon: "settings" },
];
