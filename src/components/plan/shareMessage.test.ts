import { describe, expect, it } from "vitest";

import type { PlanDetailResult } from "@/types";

import { planShareMessage } from "./shareMessage";

function stop(order: number, name: string, estimatedCost: number, estimatedDuration: number) {
  return {
    id: order,
    order,
    estimatedCost,
    estimatedDuration,
    activity: {
      id: order,
      name,
      description: "",
      estimatedCost,
      estimatedDuration,
      type: null,
      averageRating: 0,
      ratingCount: 0,
      categories: [],
      locations: [],
    },
  };
}

const plan = {
  id: 7,
  title: "Tarde de vinos",
  description: "Una copa con vista",
  estimatedTotalCost: 12000,
  estimatedTotalDuration: 300,
  details: [stop(2, "Cena", 3500, 60), stop(1, "Bodega", 8500, 240)],
} as unknown as PlanDetailResult;

describe("planShareMessage", () => {
  it("tells the plan in order, with its cost, time and link", () => {
    const message = planShareMessage(plan, "https://smartplan.app/plans/7");
    const lines = message.split("\n");

    expect(lines[0]).toBe("✨ *Tarde de vinos*");
    expect(lines[1]).toBe("Una copa con vista");
    expect(message.indexOf("1. Bodega")).toBeLessThan(message.indexOf("2. Cena"));
    expect(message).toContain("1. Bodega · ⏱️ 4h");
    expect(message).toContain("⏱️ Duración: 5h");
    expect(message).toContain("💰 Total estimado:");
    expect(lines.at(-1)).toBe("👉 Miralo completo en SmartPlan: https://smartplan.app/plans/7");
  });

  it("leaves out a missing description", () => {
    const message = planShareMessage({ ...plan, description: null }, "u");
    expect(message.split("\n")[1]).toBe("");
  });
});
