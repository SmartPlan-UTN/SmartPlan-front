import type { CommunityCreator, CommunityCreatorSummary, CommunityExperience, CommunityExperiencesPage, CommunityFeedFilter, CommunityFeedItem, CommunityPlan, CommunityPlanSort, PaginatedResult } from '@/types';
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

type CommunityParams = { page?: number; limit?: number; q?: string; sort?: CommunityPlanSort };

export function getCommunityFeed(params: CommunityParams & { type?: CommunityFeedFilter } = {}) {
  return apiClient.get<PaginatedResult<CommunityFeedItem>>('/community/feed', { params });
}

export function getCommunityExperiences(params: CommunityParams = {}) {
  return apiClient.get<PaginatedResult<CommunityExperience>>('/community/experiences', { params });
}

export function getCommunityExperience(id: number) {
  return apiClient.get<CommunityExperience>(`/community/experiences/${id}`);
}

export function likeCommunityExperience(id: number) {
  return apiClient.put<{ liked: boolean; likeCount: number }>(`/community/experiences/${id}/like`);
}

export function unlikeCommunityExperience(id: number) {
  return apiClient.delete<{ liked: boolean; likeCount: number }>(`/community/experiences/${id}/like`);
}

export function addCommunityExperienceVisit(id: number) {
  return apiClient.post<{ visitCount: number }>(`/community/experiences/${id}/visits`);
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

export function getCommunityCreators() {
  return apiClient.get<CommunityCreatorSummary[]>('/community/creators');
}

/** Published plans other people adapted from this one: one level, flat. */
export function getPlanAdaptations(planId: number, params: CommunityParams = {}) {
  return apiClient.get<PaginatedResult<CommunityPlan>>(`/community/plans/${planId}/adaptations`, { params });
}

/** Published plans other people adapted from any of this person's plans. */
export function getCreatorInspired(username: string, params: CommunityParams = {}) {
  return apiClient.get<PaginatedResult<CommunityPlan>>(
    `/community/creators/${encodeURIComponent(username)}/inspired`, { params }
  );
}
