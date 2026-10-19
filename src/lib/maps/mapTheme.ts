import type { Theme } from "@/lib/theme";

import {
  BRANDED_MAP_STYLE,
  BRANDED_MAP_STYLE_DARK,
  COMPOSER_MAP_STYLE,
  COMPOSER_MAP_STYLE_DARK,
} from "./brandedMapStyle";

/**
 * Which look a map wears:
 *
 * - `branded`: the results map (`BRANDED_MAP_STYLE`).
 * - `composer`: the plan composer's quieter maps (`COMPOSER_MAP_STYLE`).
 * - `vendor`: Google's own look by day (the explore map, the location
 *   preview), and the branded night style once the dark theme is on — the
 *   vendor's default is a bright map whichever theme is on.
 */
export type MapLook = "branded" | "composer" | "vendor";

/** The land colour each look paints while tiles load (`--map-paper`). */
const MAP_PAPER: Record<Theme, string> = {
  light: "#EEE7DB",
  dark: "#241D16",
};

export function mapStylesFor(
  look: MapLook,
  theme: Theme,
): google.maps.MapTypeStyle[] | null {
  const dark = theme === "dark";
  switch (look) {
    case "branded":
      return dark ? BRANDED_MAP_STYLE_DARK : BRANDED_MAP_STYLE;
    case "composer":
      return dark ? COMPOSER_MAP_STYLE_DARK : COMPOSER_MAP_STYLE;
    case "vendor":
      return dark ? BRANDED_MAP_STYLE_DARK : null;
  }
}

/**
 * The theme-dependent part of a map's creation options. `backgroundColor`
 * can only be set when a map is created, so a map built in one theme keeps
 * that paper if the theme changes; `useMapTheme` restyles the rest.
 */
export function mapThemeOptions(
  look: MapLook,
  theme: Theme,
): Pick<google.maps.MapOptions, "styles" | "backgroundColor"> {
  const styles = mapStylesFor(look, theme);
  // Google's own look keeps Google's own paper by day.
  if (look === "vendor" && theme === "light") return { styles };
  return { styles, backgroundColor: MAP_PAPER[theme] };
}
