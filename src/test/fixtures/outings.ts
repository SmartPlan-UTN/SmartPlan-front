import type { OutingCreationResult, OutingDetail } from "@/types";

/** An outing as the backend returns it, with overridable fields (#130). */
export function outingDetail(overrides: Partial<OutingDetail> = {}): OutingDetail {
  return {
    id: 40,
    title: "Día de viñedos",
    description: null,
    estimatedTotalCost: 150,
    estimatedTotalDuration: 150,
    peopleCount: 2,
    estimatedCostPerPerson: 75,
    activityCount: 2,
    activityNames: ["Bodega boutique", "Almuerzo de campo"],
    status: "to_do",
    completedAt: null,
    feedbackState: "not_available",
    feedback: null,
    source: { id: 7, kind: "authored", title: "Día de viñedos", available: true, hasCommunity: true },
    createdAt: "2026-09-30T12:00:00.000Z",
    travelDistanceMeters: null,
    travelDurationSeconds: null,
    details: [],
    ...overrides,
  };
}

export function outingCreation(
  overrides: Partial<OutingDetail> = {},
  created = true,
): OutingCreationResult {
  return { created, outing: outingDetail(overrides) };
}
