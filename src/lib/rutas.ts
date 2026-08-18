/**
 * Mapa de rutas de la aplicación.
 *
 * Las rutas se escriben una sola vez acá y se referencian desde los `<Link>`,
 * los redirects y los tests. Un string suelto en un componente se rompe en
 * silencio cuando la carpeta se renombra; una constante rompe la compilación.
 *
 * Las carpetas de ruta van en `kebab-case` y en español, como pide
 * `skills/01-dominio/`.
 */
export const RUTAS = {
  inicio: "/",
  explorar: "/explorar",
  favoritos: "/favoritos",
  historial: "/historial",
  perfil: "/perfil",
  preferencias: "/preferencias",
  login: "/login",
  registro: "/registro",
  recuperarContrasena: "/recuperar-contrasena",
  admin: "/admin",
} as const;

export type Ruta = (typeof RUTAS)[keyof typeof RUTAS];

/** Nombre del parámetro que guarda a dónde volver después de iniciar sesión. */
export const PARAM_REDIRECT = "redirect";

/**
 * Valida un destino de redirección antes de navegar a él.
 *
 * Solo se aceptan rutas internas: un valor como `https://otro-sitio.com` o
 * `//otro-sitio.com` en `?redirect=` convertiría el login en un redirector
 * abierto hacia cualquier dominio.
 *
 * @param destino Valor recibido por query string, o `null` si no vino.
 * @returns La ruta interna, o `null` si el valor no es seguro.
 */
export function destinoSeguro(destino: string | null | undefined): string | null {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//")) {
    return null;
  }

  return destino;
}

/**
 * Arma la URL del login conservando la ruta desde la que se expulsó al visitante.
 *
 * El inicio no se conserva: es a donde se vuelve por defecto, así que agregarlo
 * al parámetro solo ensucia la URL.
 *
 * @param destino Ruta a la que volver una vez iniciada la sesión.
 * @returns `/login` con el parámetro `redirect` cuando el destino es válido.
 */
export function rutaLogin(destino?: string | null): string {
  const ruta = destinoSeguro(destino);

  if (!ruta || ruta === RUTAS.login || ruta === RUTAS.inicio) {
    return RUTAS.login;
  }

  return `${RUTAS.login}?${PARAM_REDIRECT}=${encodeURIComponent(ruta)}`;
}

/**
 * Indica si una ruta está dentro de otra, para marcar el enlace activo de la
 * navegación. `/planes` no activa `/planes-guardados`, pero `/planes/7` sí
 * activa `/planes`.
 */
export function rutaActiva(rutaActual: string, href: string): boolean {
  if (href === RUTAS.inicio) {
    return rutaActual === RUTAS.inicio;
  }

  return rutaActual === href || rutaActual.startsWith(`${href}/`);
}
