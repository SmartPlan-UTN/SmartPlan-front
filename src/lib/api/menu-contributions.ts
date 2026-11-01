import { apiClient } from './client';

export interface MenuContributionInput { sourceUrl?: string; menuText?: string }
export interface MenuContribution {
  id: number;
  placeId: number;
  placeName?: string;
  sourceUrl: string | null;
  menuText: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  contributor?: string;
}

export function submitMenuContribution(placeId: number, input: MenuContributionInput) {
  return apiClient.post<MenuContribution>(`/menu-contributions/places/${placeId}`, input);
}

export function submitMenuContributionPhoto(placeId: number, photo: File) {
  const body = new FormData();
  body.append('photo', photo);
  return apiClient.post<MenuContribution>(`/menu-contributions/places/${placeId}/photo`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function listPendingMenuContributions() {
  return apiClient.get<MenuContribution[]>('/admin/menu-contributions/pending');
}

export function reviewMenuContribution(id: number, decision: 'accepted' | 'rejected', sourceUrl?: string) {
  return apiClient.patch<MenuContribution>(`/admin/menu-contributions/${id}/review`, { decision, sourceUrl });
}
