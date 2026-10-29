import type {
  BulkApproveCandidatesResult,
  CatalogCandidateCounts,
  CatalogCandidateDetail,
  CatalogCandidatesQuery,
  CatalogCandidatesResult,
  UpdateCatalogCandidateInput,
} from '@/types';
import { apiClient } from './client';

/**
 * "Candidatos del catálogo" (SmartPlan-back `/admin/catalog-candidates`,
 * permission `catalog.review`): proposed activities and places a person
 * reviews before they enter the catalog.
 */
export async function listCatalogCandidates(
  params: CatalogCandidatesQuery = {},
): Promise<CatalogCandidatesResult> {
  return apiClient.get<CatalogCandidatesResult>('/admin/catalog-candidates', { params });
}

/** Counts per status, and pending per origin, for the queue tabs. */
export async function getCatalogCandidateCounts(): Promise<CatalogCandidateCounts> {
  return apiClient.get<CatalogCandidateCounts>('/admin/catalog-candidates/counts');
}

/** One candidate with what its place already offers and what review changed. */
export async function getCatalogCandidate(id: number): Promise<CatalogCandidateDetail> {
  return apiClient.get<CatalogCandidateDetail>(`/admin/catalog-candidates/${id}`);
}

/**
 * Edits a pending candidate. Answers `400 VALIDATION_FAILED` with
 * `errors: [{ field, messages }]` (catalog package codes) per field.
 */
export async function updateCatalogCandidate(
  id: number,
  input: UpdateCatalogCandidateInput,
): Promise<CatalogCandidateDetail> {
  return apiClient.patch<CatalogCandidateDetail>(`/admin/catalog-candidates/${id}`, input);
}

/**
 * Approves through the catalog import. `409 CANDIDATE_POSSIBLE_DUPLICATE`
 * carries `duplicates` (slugs); approve again with `force` to accept it.
 */
export async function approveCatalogCandidate(
  id: number,
  force = false,
): Promise<{ id: number; appliedEntityId: number | null }> {
  return apiClient.post(`/admin/catalog-candidates/${id}/approve`, force ? { force } : {});
}

/** Discards with a required reason; the proposal never comes back. */
export async function discardCatalogCandidate(id: number, reason: string): Promise<void> {
  await apiClient.post(`/admin/catalog-candidates/${id}/discard`, { reason });
}

/** Approves several activities of one place, reporting each one. */
export async function bulkApproveCatalogCandidates(
  ids: number[],
  force = false,
): Promise<BulkApproveCandidatesResult> {
  return apiClient.post<BulkApproveCandidatesResult>(
    '/admin/catalog-candidates/bulk-approve',
    force ? { ids, force } : { ids },
  );
}
