import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";

/**
 * Reads and writes the JWT in the browser.
 *
 * The concrete storage lives only here: the rest of the application consumes
 * the session through `SessionProvider` / `useSession`. If the token later
 * moves to an `httpOnly` cookie —which would enable protecting routes on the
 * server— only this file needs to change.
 *
 * All functions are safe to call during server rendering: if there is no
 * `window`, they return `null` or do nothing.
 */

/** Custom event: signals a session change within the same tab. */
const SESSION_EVENT = "smartplan:session";

const hasWindow = () => typeof window !== "undefined";

/**
 * Returns the stored JWT, or `null` if there is no session.
 *
 * `localStorage` can throw in strict private mode or with third-party
 * cookies blocked, so access is guarded.
 */
export function readToken(): string | null {
  if (!hasWindow()) {
    return null;
  }

  try {
    return localStorage.getItem(DEFAULT_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Saves the JWT and notifies subscribers in the current tab. */
export function saveToken(token: string): void {
  if (!hasWindow()) {
    return;
  }

  try {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, token);
  } catch {
    // If the browser blocks storage, the session cannot persist: the
    // state is re-read from `localStorage` and the guard will redirect
    // to login. Notify anyway so the UI doesn't end up half-updated.
  }

  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** Clears the JWT and notifies subscribers in the current tab. */
export function clearToken(): void {
  if (!hasWindow()) {
    return;
  }

  try {
    localStorage.removeItem(DEFAULT_TOKEN_STORAGE_KEY);
  } catch {
    // Same as above: even if writing fails, the change still needs to be notified.
  }

  window.dispatchEvent(new Event(SESSION_EVENT));
}

/**
 * Subscribes a callback to session changes.
 *
 * Covers both possible sources: the custom event for what happens in this
 * tab, and `storage` for what happens in another one (logging out in one
 * tab has to log out in all of them).
 *
 * @returns Unsubscribe function.
 */
export function subscribeToSession(onChange: () => void): () => void {
  if (!hasWindow()) {
    return () => undefined;
  }

  const onStorageChange = (event: StorageEvent) => {
    if (event.key === null || event.key === DEFAULT_TOKEN_STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener("storage", onStorageChange);

  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener("storage", onStorageChange);
  };
}
