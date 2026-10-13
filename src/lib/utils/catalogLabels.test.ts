import { describe, expect, it } from "vitest";

import { categoryLabel, localizeCatalogText } from "./catalogLabels";

describe("categoryLabel", () => {
  it.each([
    ["Culture", "Cultura"],
    ["Entertainment", "Entretenimiento"],
    ["Gastronomy", "Gastronomía"],
    ["Live music", "Música en vivo"],
    ["Nightlife", "Vida nocturna"],
    ["Outdoors", "Aire libre"],
    ["Shopping", "Compras"],
    ["Short trips", "Escapadas"],
    ["Sports", "Deportes"],
    ["Wellness", "Bienestar"],
  ])("shows %s as %s", (name, label) => {
    expect(categoryLabel(name)).toBe(label);
  });

  it("also labels the lowercase activity types the catalog uses", () => {
    expect(categoryLabel("gastronomy")).toBe("Gastronomía");
    expect(categoryLabel("outdoor")).toBe("Aire libre");
    expect(categoryLabel("live music")).toBe("Música en vivo");
  });

  it("leaves a name it does not know untouched", () => {
    expect(categoryLabel("Bodegas")).toBe("Bodegas");
    expect(categoryLabel("Wine & Cheese")).toBe("Wine & Cheese");
  });
});

describe("localizeCatalogText", () => {
  it("replaces raw identifiers inside a sentence, including multi-word ones", () => {
    expect(
      localizeCatalogText("Añadir más Culture y Live music equilibra tu Gastronomy."),
    ).toBe("Añadir más Cultura y Música en vivo equilibra tu Gastronomía.");
  });

  it("does not touch words that merely contain an identifier", () => {
    expect(localizeCatalogText("Sportswear y culturales")).toBe(
      "Sportswear y culturales",
    );
    expect(localizeCatalogText("Una mañana tranquila")).toBe(
      "Una mañana tranquila",
    );
  });

  it("leaves Spanish text as it is", () => {
    expect(localizeCatalogText("Económico y tranquilo")).toBe(
      "Económico y tranquilo",
    );
  });
});
