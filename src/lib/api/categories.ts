import type {
  CategoryListParams,
  CategoryOption,
  PaginatedResult,
} from '@/types';
import { apiClient } from './client';

/**
 * Lists active categories, for the CU10 filter chips.
 * Backend contract: `GET /categories`.
 */
export async function listCategories(
  params: CategoryListParams = {}
): Promise<PaginatedResult<CategoryOption>> {
  return apiClient.get<PaginatedResult<CategoryOption>>('/categories', {
    params,
  });
}
