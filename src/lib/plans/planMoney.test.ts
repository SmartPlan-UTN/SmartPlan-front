import { describe, expect, it } from "vitest";

import type { PlanDetailResult } from "@/types";

import { hasMoneyToShow, planMoneyLine, planPerPersonLine } from "./planMoney";

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

describe("planPerPersonLine", () => {
  it("shows both ends of a menu estimate for the known group size", () => {
    expect(
      planPerPersonLine(
        plan({
          estimatedTotalCost: 80000,
          estimatedTotalCostMax: 100000,
          priceCompleteness: "RANGE",
          peopleCount: 2,
        } as never),
      ),
    ).toBe("$\u00a040.000 – $\u00a050.000 por persona · 2 personas");
  });

  it("labels partial prices as a lower bound and names the missing costs", () => {
    expect(
      planPerPersonLine(
        plan({
          estimatedTotalCost: 20000,
          priceCompleteness: "PARTIAL",
          unpricedCount: 1,
          peopleCount: 2,
        } as never),
      ),
    ).toBe("Desde $\u00a010.000 por persona · hay paradas sin precio");
  });

  it("does not invent a per-person value without party size or a known amount", () => {
    expect(planPerPersonLine(plan({ estimatedTotalCost: 1000 } as never))).toBeNull();
    expect(
      planPerPersonLine(
        plan({ estimatedTotalCost: 1000, peopleCount: 2, priceCompleteness: "NONE" } as never),
      ),
    ).toBeNull();
  });
});
