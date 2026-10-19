import { describe, expect, it } from "vitest";

import type { PlanDetailResult } from "@/types";

import { hasMoneyToShow, planMoneyLine } from "./planMoney";

const plan = (overrides: Partial<PlanDetailResult> = {}) =>
  ({
    estimatedTotalCost: null,
    priceCompleteness: "NONE",
    unpricedCount: 1,
    details: [],
    insight: null,
    ...overrides,
  }) as unknown as PlanDetailResult;

const live = (priceCheckedAt: string | null, budgetStatus = "NO_BUDGET") =>
  plan({ insight: { priceBasis: "PROVIDER_LIVE", priceCheckedAt, budgetStatus } } as never);

describe("planMoneyLine", () => {
  it("never calls a saved live check 'hoy' when it was made on another day", () => {
    const line = planMoneyLine(live("2020-01-05T12:00:00Z", "WITHIN"));
    expect(line.value).toBe("Dentro de tu presupuesto");
    expect(line.note).toContain("el 5 de enero");
    expect(line.note).not.toContain("hoy");
  });

  it("uses neutral wording when the check date is unknown", () => {
    const line = planMoneyLine(live(null));
    expect(line.note).toBe("al generar el plan");
    expect(line.value).not.toContain("hoy");
  });

  it("states a known total when the plan has one", () => {
    expect(
      hasMoneyToShow(plan({ estimatedTotalCost: 54000, priceCompleteness: "EXACT" } as never)),
    ).toBe(true);
    expect(hasMoneyToShow(plan())).toBe(false);
  });
});
