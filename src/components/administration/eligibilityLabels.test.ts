import { describe, expect, it } from "vitest";

import type { AdminActivity } from "@/types";

import { eligibilityBadges, reasonLabel } from "./eligibilityLabels";

function activity(
  eligibility: AdminActivity["eligibility"],
): AdminActivity {
  return {
    id: 1,
    name: "Visita",
    description: "Descripción",
    estimatedCost: null,
    estimatedDuration: 60,
    type: null,
    eligibility,
    categories: [],
    places: [],
    createdAt: "2026-10-10T00:00:00Z",
    updatedAt: "2026-10-10T00:00:00Z",
  };
}

describe("eligibilityBadges", () => {
  it("shows nothing for a fully eligible activity or an old payload", () => {
    expect(
      eligibilityBadges(
        activity({
          status: "published",
          discoverable: true,
          planEligible: true,
          autoRecommendEligible: true,
          reasons: [],
        }),
      ),
    ).toEqual([]);
    expect(eligibilityBadges(activity(undefined))).toEqual([]);
  });

  it("explains why an activity is not recommended automatically", () => {
    const [badge] = eligibilityBadges(
      activity({
        status: "published",
        discoverable: true,
        planEligible: true,
        autoRecommendEligible: false,
        reasons: ["price_unknown", "no_coordinates"],
      }),
    );
    expect(badge.label).toBe("No se recomienda sola");
    expect(badge.detail).toContain("No tiene un precio confirmado");
    expect(badge.detail).toContain("coordenadas");
  });

  it("flags unpublished and hidden activities before anything else", () => {
    expect(
      eligibilityBadges(
        activity({
          status: "in_review",
          discoverable: false,
          planEligible: false,
          autoRecommendEligible: false,
          reasons: ["not_published"],
        }),
      )[0].label,
    ).toBe("En revisión");
    expect(
      eligibilityBadges(
        activity({
          status: "published",
          discoverable: false,
          planEligible: false,
          autoRecommendEligible: false,
          reasons: ["no_description"],
        }),
      )[0].label,
    ).toBe("No visible");
  });

  it("falls back to the raw code for an unknown reason", () => {
    expect(reasonLabel("something_new")).toBe("something_new");
  });
});
