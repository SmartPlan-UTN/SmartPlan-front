/**
 * JWT access abstraction decoupled from the concrete storage mechanism.
 * Allows integrating with any authentication strategy (localStorage, cookies, React Context, NextAuth, etc.)
 * while remaining compatible with SSR / the Next.js App Router.
 */

/**
 * Function that returns a JWT token synchronously or asynchronously, or `null` if there is no active session.
 */
export type TokenGetter = () => string | null | Promise<string | null>;

let customTokenGetter: TokenGetter | null = null;

/**
 * Default key used in `localStorage` when no custom getter is registered.
 */
export const DEFAULT_TOKEN_STORAGE_KEY = 'smartplan_token';

/**
 * Registers a custom provider for obtaining the JWT.
 * Useful for wiring up the real authentication state once the UI/Context is implemented.
 *
 * @param getter Function that provides the token, or `null` to reset to the default behavior.
 */
export function setTokenGetter(getter: TokenGetter | null): void {
  customTokenGetter = getter;
}

/**
 * Gets the current JWT token.
 * Safe to call in Server Components or Client Components, and SSR-compatible.
 *
 * @returns The JWT token, or `null` if no token is available.
 */
export async function getToken(): Promise<string | null> {
  if (customTokenGetter) {
    try {
      return await customTokenGetter();
    } catch {
      return null;
    }
  }

  // Safe default fallback for the browser environment
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(DEFAULT_TOKEN_STORAGE_KEY) ?? localStorage.getItem('token');
    } catch {
      // In case localStorage is restricted (strict private/incognito mode, etc.)
      return null;
    }
  }

  return null;
}
