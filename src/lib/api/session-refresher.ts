/**
 * Session renewal hook for the HTTP client, decoupled from the concrete
 * session implementation — the same inversion used by `token-provider`.
 *
 * `SessionProvider` (`@/lib/auth`) registers a refresher on mount; the
 * response interceptor in `client.ts` calls it when an authenticated request
 * comes back 401 so an expired access token renews itself instead of
 * dropping the user to the login screen.
 */

/**
 * Renews the session and applies the result. Resolves when a new access
 * token is in place, rejects when the session can no longer be renewed.
 */
export type SessionRefresher = () => Promise<void>;

let customRefresher: SessionRefresher | null = null;
let inFlight: Promise<boolean> | null = null;

/**
 * Registers the function that renews the session.
 *
 * @param refresher Renewal function, or `null` to unregister it.
 */
export function setSessionRefresher(refresher: SessionRefresher | null): void {
  customRefresher = refresher;
}

/**
 * Renews the session, collapsing concurrent callers onto a single request.
 *
 * The single-flight is a correctness requirement, not an optimization:
 * `SmartPlan-back` rotates the refresh token on every `POST /sessions/refresh`
 * and treats a second use of the old one as theft, revoking the whole session
 * with `REFRESH_TOKEN_REUSED`. A screen that fires several requests in
 * parallel gets several simultaneous 401s once the access token expires, so
 * without this every one of them would refresh and all but the first would
 * log the user out — the opposite of the intended repair.
 *
 * @returns `true` when the session was renewed, `false` when no refresher is
 * registered or the renewal failed. Never rejects.
 */
export function refreshSessionOnce(): Promise<boolean> {
  if (inFlight) {
    return inFlight;
  }

  const refresher = customRefresher;
  if (!refresher) {
    return Promise.resolve(false);
  }

  inFlight = refresher()
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
