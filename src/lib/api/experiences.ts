import type { CommunityCreator, CommunityExperience, CommunityExperiencesPage, CommunityPlan, PaginatedResult } from '@/types';
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

type CommunityParams = { page?: number; limit?: number; q?: string };

export function getCommunityExperiences(params: CommunityParams = {}) {
  return apiClient.get<PaginatedResult<CommunityExperience>>('/community/experiences', { params });
}

export function getCommunityExperience(id: number) {
  return apiClient.get<CommunityExperience>(`/community/experiences/${id}`);
}

export function getCommunityCreator(username: string) {
  return apiClient.get<CommunityCreator>(`/community/creators/${encodeURIComponent(username)}`);
}

export function getCreatorExperiences(username: string, params: CommunityParams = {}) {
  return apiClient.get<PaginatedResult<CommunityExperience>>(
    `/community/creators/${encodeURIComponent(username)}/experiences`, { params }
  );
}

export function getCommunityPlans(params: CommunityParams = {}) {
  return apiClient.get<PaginatedResult<CommunityPlan>>('/community/plans', { params });
}

export function getCreatorPlans(username: string, params: CommunityParams = {}) {
  return apiClient.get<PaginatedResult<CommunityPlan>>(
    `/community/creators/${encodeURIComponent(username)}/plans`, { params }
  );
}
