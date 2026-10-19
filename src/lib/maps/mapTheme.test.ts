import { describe, expect, it } from "vitest";

import {
  BRANDED_MAP_STYLE,
  BRANDED_MAP_STYLE_DARK,
  COMPOSER_MAP_STYLE,
  COMPOSER_MAP_STYLE_DARK,
} from "./brandedMapStyle";
import { mapStylesFor, mapThemeOptions } from "./mapTheme";

describe("mapStylesFor", () => {
  it("picks each look's day or night style", () => {
    expect(mapStylesFor("branded", "light")).toBe(BRANDED_MAP_STYLE);
    expect(mapStylesFor("branded", "dark")).toBe(BRANDED_MAP_STYLE_DARK);
    expect(mapStylesFor("composer", "light")).toBe(COMPOSER_MAP_STYLE);
    expect(mapStylesFor("composer", "dark")).toBe(COMPOSER_MAP_STYLE_DARK);
  });

  it("leaves Google's own look alone by day and darkens it at night", () => {
    expect(mapStylesFor("vendor", "light")).toBeNull();
    expect(mapStylesFor("vendor", "dark")).toBe(BRANDED_MAP_STYLE_DARK);
  });
});

describe("mapThemeOptions", () => {
  it("paints the map paper of the theme the map is created in", () => {
    expect(mapThemeOptions("composer", "light")).toEqual({
      styles: COMPOSER_MAP_STYLE,
      backgroundColor: "#EEE7DB",
    });
    expect(mapThemeOptions("composer", "dark")).toEqual({
      styles: COMPOSER_MAP_STYLE_DARK,
      backgroundColor: "#241D16",
    });
  });

  it("keeps Google's own paper for its own look by day", () => {
    expect(mapThemeOptions("vendor", "light")).toEqual({ styles: null });
  });
});
