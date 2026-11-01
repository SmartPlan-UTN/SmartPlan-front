import { describe, expect, it } from "vitest";
import { placePriceReferenceText } from "./PlacePriceReference";
import type { ExternalPrice } from "@/types";

const price: ExternalPrice = {
  min: 10,
  max: 20,
  currency: null,
  level: null,
  source: "google",
};

describe("place price reference currency", () => {
  it("does not label unknown currency or dollars as Argentine pesos", () => {
    expect(placePriceReferenceText(price)).toBeNull();
    expect(placePriceReferenceText({ ...price, currency: "USD" })).toBeNull();
  });
  it("keeps the qualitative level when an amount's currency is unknown", () => {
    expect(placePriceReferenceText({ ...price, level: "PRICE_LEVEL_MODERATE" })).toBe("Precio moderado ($$)");
  });
  it("shows a range only when the publisher identifies ARS", () => {
    expect(placePriceReferenceText({ ...price, currency: "ARS" })).toMatch(/10.*20/);
  });
});
