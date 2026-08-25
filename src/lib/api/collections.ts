import type { CollectionDetail, CreateCollectionInput } from '@/types';
import { apiClient } from './client';

/** Creates an activity collection owned by the authenticated user (CU32). */
export async function createCollection(
  input: CreateCollectionInput
): Promise<CollectionDetail> {
  return apiClient.post<CollectionDetail>('/collections', input);
}
