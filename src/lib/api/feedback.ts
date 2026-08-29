import type { CreateFeedbackPayload, PlanFeedback } from '@/types';
import { apiClient } from './client';

/**
 * Records the user's post-experience feedback for a completed plan
 * (CU23 · US18). Backend contract: `POST /plans/:id/feedback`.
 *
 * Only `rating` (1–5) is required. Errors surface as `ApiError` with codes
 * `FEEDBACK_NOT_YET_AVAILABLE` (409, plan not `completed`),
 * `FEEDBACK_ALREADY_SUBMITTED` (409), `ACCESS_DENIED` (403), or
 * `PLAN_NOT_FOUND` (404). The estimated cost is never sent — SmartPlan
 * already knows it; the user only reports `actualCost`.
 */
export async function submitFeedback(
  planId: number,
  payload: CreateFeedbackPayload
): Promise<PlanFeedback> {
  return apiClient.post<PlanFeedback>(`/plans/${planId}/feedback`, payload);
}
