import type { IconName } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

export interface NavigationLink {
  href: string;
  label: string;
  icon: IconName;
}

/**
 * Navegación principal de la navbar: Inicio, Explorar, Favorites e Historial.
 *
 * Favorites e Historial se muestran siempre, también sin sesión: quien entre sin
 * estar logueado llega a la route y el guardián lo manda al login con el destination
 * guardado. Esconder los links dejaría la aplicación sin pistas de qué hay
 * detrás de la cuenta.
 */
export const MAIN_LINKS: readonly NavigationLink[] = [
  { href: ROUTES.home, label: "Inicio", icon: "house" },
  { href: ROUTES.explore, label: "Explorar", icon: "search" },
  { href: ROUTES.favorites, label: "Favorites", icon: "heart" },
  { href: ROUTES.history, label: "Historial", icon: "clock" },
];

/** Options del menú de user. */
export const USER_LINKS: readonly NavigationLink[] = [
  { href: ROUTES.profile, label: "Mi profile", icon: "user" },
  { href: ROUTES.preferences, label: "Preferences", icon: "settings" },
];
