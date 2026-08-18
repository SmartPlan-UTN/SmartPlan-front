/**
 * Estado de sesión del frontend.
 *
 * Importar siempre desde `@/lib/auth`, no desde los archivos internos.
 */

export { SesionProvider, useSesion } from "./SesionProvider";
export type { EstadoSesion, Sesion, SesionProviderProps } from "./SesionProvider";

export { borrarToken, guardarToken, leerToken, suscribirSesion } from "./sesion";
