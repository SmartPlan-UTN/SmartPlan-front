/**
 * Abstracción de acceso al JWT desacoplada del almacenamiento concreto.
 * Permite integrarse con cualquier estrategia de autenticación (localStorage, Cookies, React Context, NextAuth, etc.)
 * manteniendo compatibilidad con SSR / Next.js App Router.
 */

/**
 * Función que retorna un token JWT síncrono o asíncrono, o `null` si no hay sesión active.
 */
export type TokenGetter = () => string | null | Promise<string | null>;

let customTokenGetter: TokenGetter | null = null;

/**
 * Clave predeterminada utilizada en `localStorage` si no se registra un getter personalizado.
 */
export const DEFAULT_TOKEN_STORAGE_KEY = 'smartplan_token';

/**
 * Permite registrar un provider personalizado para obtener el JWT.
 * Útil para cablear el status de autenticación real cuando se implemente la UI/Context.
 *
 * @param getter Función proveedora del token o `null` para restablecer al comportamiento por defecto.
 */
export function setTokenGetter(getter: TokenGetter | null): void {
  customTokenGetter = getter;
}

/**
 * Obtiene el token JWT actual.
 * Es compatible con SSR y seguro de invocar en Server Components o Client Components.
 *
 * @returns El token JWT o `null` si no hay token available.
 */
export async function getToken(): Promise<string | null> {
  if (customTokenGetter) {
    try {
      return await customTokenGetter();
    } catch {
      return null;
    }
  }

  // Fallback predeterminado seguro para environment del navegador
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(DEFAULT_TOKEN_STORAGE_KEY) ?? localStorage.getItem('token');
    } catch {
      // En caso de que localStorage esté restringido (modo incógnito privado estricto, etc.)
      return null;
    }
  }

  return null;
}
