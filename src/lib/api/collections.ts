import type {
  CollectionDetail,
  CollectionSummary,
  CreateCollectionInput,
  ListCollectionsParams,
  PaginatedResult,
  UpdateCollectionInput,
} from '@/types';
import { apiClient } from './client';

/** Lists collections owned by the authenticated user. */
export async function listCollections(
  params: ListCollectionsParams = {}
): Promise<PaginatedResult<CollectionSummary>> {
  return apiClient.get<PaginatedResult<CollectionSummary>>('/collections', {
    params,
  });
}

/** Creates an activity collection owned by the authenticated user (CU32). */
export async function createCollection(
  input: CreateCollectionInput
): Promise<CollectionDetail> {
  return apiClient.post<CollectionDetail>('/collections', input);
}

/** Loads one collection owned by the authenticated user (CU33). */
export async function getCollection(id: number): Promise<CollectionDetail> {
  return apiClient.get<CollectionDetail>(`/collections/${id}`);
}

/** Updates an owned collection's name or description (CU33). */
export async function updateCollection(
  id: number,
  input: UpdateCollectionInput
): Promise<CollectionDetail> {
  return apiClient.patch<CollectionDetail>(`/collections/${id}`, input);
}

/** Soft-deletes an owned collection without deleting catalog activities (CU34). */
export async function deleteCollection(id: number): Promise<void> {
  await apiClient.delete<void>(`/collections/${id}`);
}
