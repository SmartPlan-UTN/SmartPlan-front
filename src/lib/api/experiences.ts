import type { CommunityExperiencesPage } from '@/types';
import { apiClient } from './client';

/**
 * A page of a published plan's community experiences, with the summary
 * (#106). Backend contract: `GET /plans/:id/experiences`; answers
 * `404 PLAN_NOT_FOUND` exactly like the plan detail.
 */
export async function getPlanExperiences(
  planId: number,
  params: { page?: number; limit?: number } = {}
): Promise<CommunityExperiencesPage> {
  return apiClient.get<CommunityExperiencesPage>(`/plans/${planId}/experiences`, { params });
}
