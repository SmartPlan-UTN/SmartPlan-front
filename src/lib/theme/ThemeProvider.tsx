"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useSession } from "@/lib/auth";

import {
  readAppliedTheme,
  readUserTheme,
  subscribeToThemeStorage,
  writeAppliedTheme,
  writeUserTheme,
  type Theme,
} from "./storage";

export interface ThemeState {
  /** The theme on screen. Always `light` without a session. */
  theme: Theme;
  /**
   * Whether the theme can be switched: only with a session. Anonymous
   * screens (the landing for a visitor, login, signup) stay light.
   */
  canToggle: boolean;
  /** Flips the authenticated account's theme and remembers it. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

/** Nothing is stored on the server: the first render is always light. */
function serverSnapshot(): null {
  return null;
}

/**
 * Switching themes recolours almost every element at once. Without this,
 * each one would animate on its own `transition` (some in 120ms, some in
 * 300ms, many not at all), which reads as a glitch rather than a switch.
 */
function withoutTransitions(change: () => void): void {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode("*,*::before,*::after{transition:none!important}"),
  );
  document.head.appendChild(style);
  change();
  // Reading a computed style forces the new colours to apply while
  // transitions are still off; only then can they come back.
  window.getComputedStyle(document.body).getPropertyValue("background-color");
  window.setTimeout(() => {
    style.remove();
  }, 1);
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (root.dataset.theme !== theme) {
    withoutTransitions(() => {
      root.dataset.theme = theme;
    });
  }
  writeAppliedTheme(theme);
}

export interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Light or dark, per account.
 *
 * The dark theme is a choice made once logged in: the toggle only exists
 * with a session, and logging out returns every screen to light. Each
 * account's choice is remembered in this browser (see `storage.ts`), so
 * the next login brings it back.
 *
 * The theme itself is `data-theme` on `<html>`; every colour that changes
 * with it is a token in `src/styles/tokens.css`. Components never branch
 * on the theme to pick a colour — only code that can't read CSS (a Google
 * Maps style, a canvas) asks `useTheme()`.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { status, user } = useSession();
  const userId = status === "authenticated" && user ? user.id : null;

  const preference = useSyncExternalStore(
    subscribeToThemeStorage,
    () => (userId === null ? null : readUserTheme(userId)),
    serverSnapshot,
  );
  const lastApplied = useSyncExternalStore(
    subscribeToThemeStorage,
    readAppliedTheme,
    serverSnapshot,
  );

  // While the session is still being rebuilt, the boot script's guess is
  // what's on screen: report that instead of flashing light and back.
  const theme: Theme =
    status === "loading"
      ? (lastApplied ?? "light")
      : userId !== null && preference === "dark"
        ? "dark"
        : "light";

  useEffect(() => {
    if (status === "loading") return;
    applyTheme(theme);
  }, [status, theme]);

  const toggleTheme = useCallback(() => {
    if (userId === null) return;
    writeUserTheme(userId, theme === "dark" ? "light" : "dark");
  }, [userId, theme]);

  const value = useMemo<ThemeState>(
    () => ({ theme, canToggle: userId !== null, toggleTheme }),
    [theme, userId, toggleTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/** Outside a provider there's no session to choose with: light, fixed. */
const LIGHT_ONLY: ThemeState = {
  theme: "light",
  canToggle: false,
  toggleTheme: () => undefined,
};

/**
 * Returns the active theme.
 *
 * Unlike `useSession()`, it doesn't throw outside `ThemeProvider`: light is
 * a complete answer there (no session, no toggle), and it lets a component
 * that only reads the theme — a map choosing its style — render on its own
 * in a test.
 */
export function useTheme(): ThemeState {
  return useContext(ThemeContext) ?? LIGHT_ONLY;
}
