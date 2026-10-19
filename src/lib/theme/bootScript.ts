import { APPLIED_THEME_KEY } from "./storage";

/**
 * Runs inline in `<head>`, before the body paints: if the last theme on
 * screen was dark, it marks `<html>` so the first frame is already dark.
 *
 * It can't wait for React. The session is rebuilt from the refresh cookie
 * after a network round trip (`SessionProvider`), so a dark session would
 * otherwise flash the light theme on every reload. `ThemeProvider` takes
 * over once the session resolves and corrects the guess if it no longer
 * holds (the session expired, say).
 *
 * Kept tiny and dependency-free on purpose: it's a string, not a module.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  APPLIED_THEME_KEY,
)})==="dark"){document.documentElement.dataset.theme="dark";}}catch(e){}})();`;
