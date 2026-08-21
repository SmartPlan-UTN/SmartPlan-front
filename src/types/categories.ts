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
