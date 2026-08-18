import type { IconName } from "@/components/ui";
import { RUTAS } from "@/lib/rutas";

export interface EnlaceNavegacion {
  href: string;
  etiqueta: string;
  icono: IconName;
}

/**
 * Navegación principal de la barra: Inicio, Explorar, Favoritos e Historial.
 *
 * Favoritos e Historial se muestran siempre, también sin sesión: quien entre sin
 * estar logueado llega a la ruta y el guardián lo manda al login con el destino
 * guardado. Esconder los enlaces dejaría la aplicación sin pistas de qué hay
 * detrás de la cuenta.
 */
export const ENLACES_PRINCIPALES: readonly EnlaceNavegacion[] = [
  { href: RUTAS.inicio, etiqueta: "Inicio", icono: "house" },
  { href: RUTAS.explorar, etiqueta: "Explorar", icono: "search" },
  { href: RUTAS.favoritos, etiqueta: "Favoritos", icono: "heart" },
  { href: RUTAS.historial, etiqueta: "Historial", icono: "clock" },
];

/** Opciones del menú de usuario. */
export const ENLACES_USUARIO: readonly EnlaceNavegacion[] = [
  { href: RUTAS.perfil, etiqueta: "Mi perfil", icono: "user" },
  { href: RUTAS.preferencias, etiqueta: "Preferencias", icono: "settings" },
];
