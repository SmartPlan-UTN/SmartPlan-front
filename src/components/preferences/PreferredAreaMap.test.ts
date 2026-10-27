import { describe, expect, it } from "vitest";

import { areaLabel } from "./PreferredAreaMap";

function result(
  components: Array<[string, string[]]>,
  formatted = "Calle 123, Mendoza, Argentina",
): google.maps.GeocoderResult {
  return {
    address_components: components.map(([long_name, types]) => ({
      long_name,
      short_name: long_name,
      types,
    })),
    formatted_address: formatted,
    place_id: "place-1",
    types: [],
    geometry: {} as google.maps.GeocoderGeometry,
  };
}

describe("areaLabel", () => {
  it("names the area, not the street address", () => {
    expect(
      areaLabel(
        result([
          ["123", ["street_number"]],
          ["Belgrano", ["neighborhood", "political"]],
          ["Guaymallén", ["administrative_area_level_2", "political"]],
          ["Mendoza", ["administrative_area_level_1", "political"]],
        ]),
      ),
    ).toBe("Belgrano, Guaymallén");
  });

  it("skips repeated names", () => {
    expect(
      areaLabel(
        result([
          ["Mendoza", ["locality", "political"]],
          ["Capital", ["administrative_area_level_2", "political"]],
          ["Mendoza", ["administrative_area_level_1", "political"]],
        ]),
      ),
    ).toBe("Mendoza, Capital");
  });

  it("falls back to the formatted address", () => {
    expect(areaLabel(result([["Ruta 7", ["route"]]]))).toBe(
      "Calle 123, Mendoza, Argentina",
    );
  });
});
