"use client";

import { useEffect } from "react";

import { useTheme } from "@/lib/theme";

import { mapStylesFor, type MapLook } from "./mapTheme";

/**
 * Keeps a map's style in step with the theme after it exists: toggling the
 * moon restyles the map on screen instead of waiting for a remount. A map's
 * first style comes from its creation options (`mapThemeOptions`).
 */
export function useMapTheme(map: google.maps.Map | null, look: MapLook): void {
  const { theme } = useTheme();

  useEffect(() => {
    map?.setOptions({ styles: mapStylesFor(look, theme) });
  }, [map, look, theme]);
}
