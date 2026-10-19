import { getApiBaseUrl } from "@/lib/api/config";
import type { PlanDetailResult } from "@/types";

/**
 * A published plan as anyone without a session sees it, read on the server
 * for the link preview WhatsApp and others show. `null` when the plan is
 * private, missing or the API is down: the preview then falls back to the
 * generic one instead of failing the page.
 */
export async function fetchSharedPlan(id: number): Promise<PlanDetailResult | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/plans/${id}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    const plan = (await response.json()) as PlanDetailResult;
    return plan.kind === "authored" && plan.visibility === "public" ? plan : null;
  } catch {
    return null;
  }
}
