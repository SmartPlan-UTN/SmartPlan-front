import { describe, expect, it } from "vitest";

import type { Price } from "@/types/pricing";

import {
  computeDraftTotals,
  formatPerPerson,
  formatPlanTotal,
  formatPrice,
  isPriceUnknown,
  NO_PRICE_TOTAL_LABEL,
  priceCaveat,
  UNKNOWN_PRICE_LABEL,
} from "./pricing";

const nbsp = /\s/g;
const plain = (text: string) => text.replace(nbsp, " ");

function price(overrides: Partial<Price>): Price {
  return {
    kind: "FIXED",
    min: 1000,
    max: 1000,
    unit: "PER_PERSON",
    currency: "ARS",
    source: "CURATED",
    sourceRef: null,
    verifiedAt: null,
    confidence: "HIGH",
    stale: false,
    ...overrides,
  };
}

describe("formatPrice", () => {
  it("never renders an unknown price as $0", () => {
    expect(formatPrice({ estimatedCost: null })).toBe(UNKNOWN_PRICE_LABEL);
    expect(
      formatPrice({
        estimatedCost: null,
        price: price({ kind: "UNKNOWN", min: null, max: null, confidence: "NONE" }),
      }),
    ).toBe(UNKNOWN_PRICE_LABEL);
    expect(isPriceUnknown({ estimatedCost: null })).toBe(true);
  });

  it("says Gratis only for a FREE price, and keeps a legacy number readable", () => {
    expect(
      formatPrice({
        estimatedCost: 0,
        price: price({ kind: "FREE", min: 0, max: 0 }),
      }),
    ).toBe("Gratis");
    expect(plain(formatPrice({ estimatedCost: 2500 }))).toContain("2.500");
  });

  it("labels FROM and RANGE prices and marks low-confidence amounts as estimates", () => {
    expect(
      plain(formatPrice({ estimatedCost: 8000, price: price({ kind: "FROM", min: 8000, max: null }) })),
    ).toBe("Desde $ 8.000");
    expect(
      plain(formatPrice({ estimatedCost: 3000, price: price({ kind: "RANGE", min: 3000, max: 6000 }) })),
    ).toBe("$ 3.000 – $ 6.000");
    expect(
      plain(
        formatPrice({
          estimatedCost: 1000,
          price: price({ source: "LEGACY", confidence: "LOW" }),
        }),
      ),
    ).toBe("≈ $ 1.000");
  });

  it("appends the unit only when asked", () => {
    const priced = { estimatedCost: 1000, price: price({}) };
    expect(formatPrice(priced)).not.toContain("por persona");
    expect(formatPrice(priced, { withUnit: true })).toContain("por persona");
  });
});

describe("priceCaveat", () => {
  it("does not describe a curated reference as a user-reported expense", () => {
    expect(priceCaveat({ estimatedCost: 1, price: price({ source: "CURATED", confidence: "MEDIUM" }) })).toBe("Precio orientativo: confirmalo antes de ir");
    expect(priceCaveat({ estimatedCost: 1, price: price({ source: "USER_REPORTED", confidence: "MEDIUM" }) })).toBe("Precio estimado a partir de gastos reportados");
  });
  it("explains unverified estimates and stays silent for trusted prices", () => {
    expect(priceCaveat({ estimatedCost: 1, price: price({ source: "LEGACY", confidence: "LOW" }) })).toMatch(/sin verificar/);
    expect(priceCaveat({ estimatedCost: 1, price: price({}) })).toBeNull();
    expect(priceCaveat({ estimatedCost: 1, price: price({ stale: true }) })).toMatch(/hace tiempo/);
    expect(
      priceCaveat({
        estimatedCost: 1,
        price: price({ stale: true, verifiedAt: "2026-02-15T00:00:00.000Z" }),
      }),
    ).toMatch(/Precio de referencia de febrero de 2026/);
  });
});

describe("formatPlanTotal", () => {
  it("calls an exact zero total free, never a partial one (#210)", () => {
    expect(formatPlanTotal({ estimatedTotalCost: 0, priceCompleteness: "EXACT" })).toBe("Gratis");
    expect(
      formatPlanTotal({ estimatedTotalCost: 0, priceCompleteness: "PARTIAL", unpricedCount: 1 }),
    ).not.toBe("Gratis");
  });

  it("never shows an unpriced plan as $0", () => {
    expect(formatPlanTotal({ estimatedTotalCost: 0, priceCompleteness: "PARTIAL", unpricedCount: 2 })).toBe(NO_PRICE_TOTAL_LABEL);
    expect(formatPlanTotal({ estimatedTotalCost: null })).toBe(NO_PRICE_TOTAL_LABEL);
    expect(
      formatPlanTotal({ estimatedTotalCost: 0, priceCompleteness: "NONE" }),
    ).toBe(NO_PRICE_TOTAL_LABEL);
  });

  it("describes exact, range, lower-bound and partial totals", () => {
    expect(plain(formatPlanTotal({ estimatedTotalCost: 5000, priceCompleteness: "EXACT" }))).toBe("$ 5.000");
    expect(
      plain(formatPlanTotal({ estimatedTotalCost: 3000, estimatedTotalCostMax: 6000, priceCompleteness: "RANGE" })),
    ).toBe("$ 3.000 – $ 6.000");
    expect(plain(formatPlanTotal({ estimatedTotalCost: 3000, priceCompleteness: "LOWER_BOUND" }))).toBe("Desde $ 3.000");
    expect(
      plain(formatPlanTotal({ estimatedTotalCost: 3000, unpricedCount: 2, priceCompleteness: "PARTIAL" })),
    ).toBe("$ 3.000 + 2 sin precio");
  });

  it("formats a per-person amount or an em dash", () => {
    expect(formatPerPerson(null)).toBe("—");
    expect(plain(formatPerPerson(2500))).toBe("$ 2.500");
  });
});

describe("computeDraftTotals (mirrors the backend)", () => {
  const stop = (p: Partial<Price> | null, cost: number | null) => ({
    estimatedCost: cost,
    price: p === null ? null : price(p),
  });

  it("multiplies per-person amounts by party size and keeps group amounts", () => {
    const totals = computeDraftTotals(
      [stop({ min: 1000, max: 1000, unit: "PER_PERSON" }, 1000), stop({ min: 3000, max: 3000, unit: "PER_GROUP" }, 3000)],
      4,
    );
    expect(totals).toMatchObject({
      estimatedTotalCost: 7000,
      estimatedTotalCostMax: 7000,
      priceCompleteness: "EXACT",
    });
  });

  it("never counts an unknown price as zero", () => {
    const unknown = stop({ kind: "UNKNOWN", min: null, max: null, unit: null, confidence: "NONE" }, null);
    expect(computeDraftTotals([unknown], 2)).toMatchObject({
      estimatedTotalCost: null,
      priceCompleteness: "NONE",
      unpricedCount: 1,
    });
    expect(
      computeDraftTotals([stop({ min: 500, max: 500, unit: "PER_GROUP" }, 500), unknown], 2),
    ).toMatchObject({
      estimatedTotalCost: 500,
      estimatedTotalCostMax: null,
      priceCompleteness: "PARTIAL",
      unpricedCount: 1,
    });
  });

  it("treats a legacy stop without a price object as a group amount, and null as unknown", () => {
    expect(
      computeDraftTotals([{ estimatedCost: 1500 }, { estimatedCost: null }], 3),
    ).toMatchObject({
      estimatedTotalCost: 1500,
      priceCompleteness: "PARTIAL",
      unpricedCount: 1,
    });
  });
});
