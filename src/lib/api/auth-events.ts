/**
 * Pub/sub event system for notifying unauthorized authentication states (401 Unauthorized).
 * Lets the UI layer or the future AuthProvider react (e.g. redirect to login or clear the session)
 * without coupling the HTTP infrastructure to specific screens.
 */

export type UnauthorizedListener = () => void;

const listeners: Set<UnauthorizedListener> = new Set();
let notificationInProgress = false;
let notificationTimer: ReturnType<typeof setTimeout> | null = null;

/** Deduplication window in milliseconds for concurrent requests that return 401 */
const DEDUPLICATION_WINDOW_MS = 1000;

/**
 * Subscribes a callback to be executed when a 401 Unauthorized error is detected.
 *
 * @param listener Function to run when the session is no longer valid.
 * @returns Unsubscribe function to remove the listener.
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notifies all subscribers that a 401 response was received.
 * Deduplicates multiple concurrent requests within a short interval.
 */
export function notifyUnauthorized(): void {
  if (notificationInProgress) {
    return;
  }

  notificationInProgress = true;

  listeners.forEach((listener) => {
    try {
      listener();
    } catch (_err) {
      // Ignore errors raised inside UI listeners so they don't break the request chain
    }
  });

  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }

  notificationTimer = setTimeout(() => {
    notificationInProgress = false;
    notificationTimer = null;
  }, DEDUPLICATION_WINDOW_MS);
}
