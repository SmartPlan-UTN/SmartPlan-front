/**
 * Mapa de rutas de la aplicación.
 *
 * Las rutas se escriben una sola vez acá y se referencian desde los `<Link>`,
 * los redirects y los tests. Un string suelto en un componente se rompe en
 * silencio cuando la carpeta se renombra; una constante rompe la compilación.
 *
 * Las carpetas de route van en `kebab-case` y en español, como pide
 * `skills/01-domain/`.
 */
export const ROUTES = {
  home: "/",
  explore: "/explore",
  favorites: "/favorites",
  history: "/history",
  profile: "/profile",
  preferences: "/preferences",
  login: "/login",
  signup: "/signup",
  recoverPassword: "/recover-password",
  admin: "/admin",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/** Nombre del parámetro que guarda a dónde volver después de iniciar sesión. */
export const REDIRECT_PARAM = "redirect";

/**
 * Valida un destination de redirección antes de navegar a él.
 *
 * Solo se aceptan rutas internas: un value como `https://otro-sitio.com` o
 * `//otro-sitio.com` en `?redirect=` convertiría el login en un redirector
 * abierto hacia cualquier dominio.
 *
 * @param destination Valor recibido por query string, o `null` si no vino.
 * @returns La route interna, o `null` si el value no es seguro.
 */
export function safeDestination(destination: string | null | undefined): string | null {
  if (!destination || !destination.startsWith("/") || destination.startsWith("//")) {
    return null;
  }

  return destination;
}

/**
 * Arma la URL del login conservando la route desde la que se expulsó al visitante.
 *
 * El home no se conserva: es a donde se vuelve por defecto, así que agregarlo
 * al parámetro solo ensucia la URL.
 *
 * @param destination Route a la que volver una vez iniciada la sesión.
 * @returns `/login` con el parámetro `redirect` cuando el destination es válido.
 */
export function loginRoute(destination?: string | null): string {
  const route = safeDestination(destination);

  if (!route || route === ROUTES.login || route === ROUTES.home) {
    return ROUTES.login;
  }

  return `${ROUTES.login}?${REDIRECT_PARAM}=${encodeURIComponent(route)}`;
}

/**
 * Indica si una route está dentro de otra, para marcar el link active de la
 * navegación. `/plans` no active `/plans-guardados`, pero `/plans/7` sí
 * active `/plans`.
 */
export function isActiveRoute(currentRoute: string, href: string): boolean {
  if (href === ROUTES.home) {
    return currentRoute === ROUTES.home;
  }

  return currentRoute === href || currentRoute.startsWith(`${href}/`);
}
