/**
 * Light/dark theme.
 *
 * Always import from `@/lib/theme`, not from the internal files.
 */

export { ThemeProvider, useTheme } from "./ThemeProvider";
export type { ThemeProviderProps, ThemeState } from "./ThemeProvider";
export { THEME_BOOT_SCRIPT } from "./bootScript";
export type { Theme } from "./storage";
