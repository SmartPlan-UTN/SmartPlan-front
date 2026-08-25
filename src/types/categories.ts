import { BaseEntity, CatalogEntity } from './common';

/**
 * Activity category (CU10, CU54).
 */
export interface Category extends BaseEntity {
  name: string;
  description: string | null;
  idCategoryStatus: number;
  status?: CategoryStatus;
}

/**
 * Expected keys for a category's status (CU54).
 * Values match exactly what's seeded in SmartPlan-back.
 */
export type CategoryStatusKey = 'active' | 'inactive';

/**
 * Status of a category (CU54).
 */
export interface CategoryStatus extends CatalogEntity<CategoryStatusKey> {
  key: CategoryStatusKey;
}

/**
 * Active-category projection returned by `GET /categories` (CU10): just
 * enough to build a filter chip, without the full catalog entity.
 */
export interface CategoryOption {
  id: number;
  name: string;
  description: string | null;
}

/** Query params accepted by `GET /categories`. */
export interface CategoryListParams {
  search?: string;
  page?: number;
  limit?: number;
}
