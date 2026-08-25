/**
 * JWT access abstraction decoupled from the concrete storage mechanism.
 * Allows integrating with any authentication strategy (in-memory state,
 * React Context, NextAuth, etc.) while remaining compatible with SSR / the
 * Next.js App Router.
 */

/**
 * Function that returns a JWT token synchronously or asynchronously, or `null` if there is no active session.
 */
export type TokenGetter = () => string | null | Promise<string | null>;

let customTokenGetter: TokenGetter | null = null;

/**
 * Registers a custom provider for obtaining the JWT.
 *
 * `SessionProvider` (`@/lib/auth`) registers one on mount that reads the
 * access token from memory: the token is never persisted in `localStorage`
 * or a readable cookie, so an XSS payload can't exfiltrate it from storage.
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
 * @returns The JWT token, or `null` if no getter is registered or there is no active session.
 */
export async function getToken(): Promise<string | null> {
  if (!customTokenGetter) {
    return null;
  }

  try {
    return await customTokenGetter();
  } catch {
    return null;
  }
}
