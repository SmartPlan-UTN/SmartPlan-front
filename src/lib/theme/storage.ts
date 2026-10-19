/**
 * Where the colour theme lives between visits.
 *
 * Two keys, on purpose:
 *
 * - `smartplan:theme:<userId>` is each account's own choice, so two people
 *   sharing a browser keep theirs. It survives logging out: the next login
 *   brings it back.
 * - `smartplan:theme` is the theme that was last on screen. The inline
 *   script in the root layout reads it before the first paint (see
 *   `THEME_BOOT_SCRIPT`), because the session itself is only known after a
 *   network round trip and waiting for it would flash the light theme on
 *   every reload of a dark session.
 *
 * Every access is wrapped: storage can be full, blocked by the browser, or
 * missing altogether, and none of that should break the page. The theme
 * just falls back to light.
 */

export type Theme = "light" | "dark";

export const APPLIED_THEME_KEY = "smartplan:theme";

export function userThemeKey(userId: number): string {
  return `${APPLIED_THEME_KEY}:${userId}`;
}

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function read(key: string): Theme | null {
  try {
    const value = window.localStorage.getItem(key);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function write(key: string, theme: Theme): void {
  try {
    window.localStorage.setItem(key, theme);
  } catch {
    // Storage unavailable (private mode, quota): the choice still applies
    // to this page, it just won't be remembered.
  }
}

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/**
 * `useSyncExternalStore` subscription. A `storage` event is how another tab
 * reports a change, so toggling in one tab updates the others too.
 */
export function subscribeToThemeStorage(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function readUserTheme(userId: number): Theme | null {
  return read(userThemeKey(userId));
}

export function writeUserTheme(userId: number, theme: Theme): void {
  write(userThemeKey(userId), theme);
  notify();
}

export function readAppliedTheme(): Theme | null {
  return read(APPLIED_THEME_KEY);
}

export function writeAppliedTheme(theme: Theme): void {
  write(APPLIED_THEME_KEY, theme);
}
