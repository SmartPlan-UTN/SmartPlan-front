import type { CreatePlanRequestPayload } from "@/types";

const PREFIX = "smartplan:request-context:";

/**
 * What the person explicitly chose for a search (party, budget, time…),
 * remembered per request so it survives opening the results page, a refresh
 * and a refinement. Never built from what SmartPlan inferred.
 */
export function saveRequestContext(
  requestId: number,
  payload: CreatePlanRequestPayload,
): void {
  try {
    window.sessionStorage.setItem(PREFIX + requestId, JSON.stringify(payload));
  } catch {
    /* storage unavailable: the search still works, only context carry-over is lost */
  }
}

export function loadRequestContext(
  requestId: number,
): CreatePlanRequestPayload | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + requestId);
    if (!raw) return null;
    const value = JSON.parse(raw) as CreatePlanRequestPayload;
    return typeof value?.query === "string" ? value : null;
  } catch {
    return null;
  }
}

/** A refinement is a new request that inherits the explicit context. */
export function carryRequestContext(fromId: number, toId: number): void {
  const payload = loadRequestContext(fromId);
  if (payload) saveRequestContext(toId, payload);
}
